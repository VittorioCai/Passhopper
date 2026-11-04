/**
 * OpenAI-style Chat Completions (DeepSeek and any compatible service), streamed straight from the
 * browser with the traveller's own key.
 */
import type { ActiveProvider } from './settings';
import { HttpError, runTool, toolsFor, type ToolContext } from './tools';

type Msg =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      reasoning_content?: string;
      tool_calls?: ToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface OpenAIHistory {
  kind: 'openai';
  messages: Msg[];
}

const MAX_STEPS = 8;

export async function runOpenAITurn(
  p: ActiveProvider,
  history: OpenAIHistory,
  system: string,
  userText: string,
  ctx: ToolContext,
  onText: (delta: string) => void,
) {
  const withSearch = !!ctx.searchKey;
  const tools = toolsFor(withSearch).map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
  history.messages.push({ role: 'user', content: userText });
  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await streamOnce(
      p,
      [{ role: 'system', content: system }, ...history.messages],
      tools,
      ctx.signal,
      onText,
    );
    history.messages.push(msg);
    if (!msg.tool_calls?.length) return;
    for (const call of msg.tool_calls) {
      let input: unknown;
      try {
        input = JSON.parse(call.function.arguments || '{}');
      } catch {
        history.messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: 'Error: arguments were not valid JSON',
        });
        continue;
      }
      const result = await runTool(call.function.name, input, ctx);
      history.messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result.isError ? `Error: ${result.content}` : result.content,
      });
    }
  }
}

async function streamOnce(
  p: ActiveProvider,
  messages: Msg[],
  tools: unknown[],
  signal: AbortSignal,
  onText: (delta: string) => void,
): Promise<Extract<Msg, { role: 'assistant' }>> {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({ model: p.model, messages, tools, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw new HttpError(res.status, await res.text().catch(() => ''));
  let content = '';
  let reasoning = '';
  const calls: ToolCall[] = [];
  for await (const data of sseData(res.body)) {
    if (data === '[DONE]') break;
    let chunk: { choices?: { delta?: Record<string, unknown> }[] };
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;
    if (typeof delta.content === 'string' && delta.content) {
      content += delta.content;
      onText(delta.content);
    }
    if (typeof delta.reasoning_content === 'string') reasoning += delta.reasoning_content;
    for (const tc of (delta.tool_calls as Record<string, unknown>[] | undefined) ?? []) {
      const i = typeof tc.index === 'number' ? tc.index : calls.length;
      const fn = (tc.function ?? {}) as { name?: string; arguments?: string };
      calls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } };
      const c = calls[i]!;
      if (typeof tc.id === 'string') c.id = tc.id;
      if (fn.name) c.function.name += fn.name;
      if (fn.arguments) c.function.arguments += fn.arguments;
    }
  }
  const tool_calls = calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || `call_${i}` }));
  return {
    role: 'assistant',
    content: content || null,
    // Thinking models expect their reasoning back while a tool loop is running.
    ...(reasoning ? { reasoning_content: reasoning } : {}),
    ...(tool_calls.length ? { tool_calls } : {}),
  };
}

/** Yields the `data:` payloads of a server-sent event stream. */
export async function* sseData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  }
  if (buf.startsWith('data:')) yield buf.slice(5).trim();
}

/** A tiny request that checks the key and model work. */
export async function testOpenAI(p: ActiveProvider, signal: AbortSignal) {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: 'user', content: 'Say OK.' }],
      max_tokens: 5,
    }),
    signal,
  });
  if (!res.ok) throw new HttpError(res.status, await res.text().catch(() => ''));
}
