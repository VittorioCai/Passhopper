/**
 * Claude through the official SDK, called straight from the browser with the traveller's own key.
 * The key never reaches a Passhopper server (there isn't one), which is the case the SDK's
 * dangerouslyAllowBrowser option exists for.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ActiveProvider } from './settings';
import { runTool, toolsFor, type ToolContext, type ToolDef } from './tools';

type MessageParam = Anthropic.Beta.BetaMessageParam;

export interface ClaudeHistory {
  kind: 'claude';
  messages: MessageParam[];
}

const MAX_STEPS = 10;

const client = (p: ActiveProvider) =>
  new Anthropic({ apiKey: p.key, dangerouslyAllowBrowser: true, maxRetries: 1 });

/** Current models that take adaptive thinking, effort and the newer web search tool. */
const isCurrent = (model: string) =>
  /^claude-(opus-(5|4-[678])|sonnet-(5|4-6)|fable-5|haiku-5)/.test(model);
/** Models that accept the server-side refusal fallback. */
const hasFallback = (model: string) => /^claude-(fable-5-1|opus-5|sonnet-5-5)/.test(model);

function requestFor(
  p: ActiveProvider,
  system: string,
  messages: MessageParam[],
  defs: ToolDef[] | undefined,
  webSearch = !defs,
) {
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    ...(defs ?? toolsFor(false)).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Beta.BetaTool.InputSchema,
      eager_input_streaming: true,
    })),
  ];
  if (webSearch)
    tools.push(
      isCurrent(p.model)
        ? { type: 'web_search_20260209', name: 'web_search', max_uses: 5 }
        : { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
    );
  const betas: Anthropic.Beta.AnthropicBeta[] = hasFallback(p.model)
    ? ['server-side-fallback-2026-07-01']
    : [];
  return {
    model: p.model,
    max_tokens: 16000,
    system: [
      { type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } },
    ],
    messages,
    tools,
    ...(isCurrent(p.model) ? { output_config: { effort: 'medium' as const } } : {}),
    ...(hasFallback(p.model) ? { fallbacks: 'default' as const } : {}),
    ...(betas.length ? { betas } : {}),
  };
}

export async function runClaudeTurn(
  p: ActiveProvider,
  history: ClaudeHistory,
  system: string,
  userText: string,
  ctx: ToolContext,
  onText: (delta: string) => void,
) {
  const api = client(p);
  history.messages.push({ role: 'user', content: userText });
  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = api.beta.messages.stream(
      requestFor(
        p,
        system,
        history.messages,
        ctx.toolset?.defs,
        ctx.toolset ? !!ctx.toolset.webSearch : true,
      ),
      {
        signal: ctx.signal,
      },
    );
    stream.on('text', onText);
    stream.on('contentBlock', (block) => {
      if (block.type === 'server_tool_use' && block.name === 'web_search') {
        const q = (block.input as { query?: unknown })?.query;
        if (typeof q === 'string') ctx.activity({ type: 'search', query: q });
      }
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content))
        ctx.sources(
          block.content
            .filter((r) => r.type === 'web_search_result')
            .map((r) => ({ title: r.title, url: r.url })),
        );
    });
    const message = await stream.finalMessage();
    // Keep the whole response, thinking blocks included, so the next request continues it unchanged.
    history.messages.push({ role: 'assistant', content: message.content });
    if (message.stop_reason === 'pause_turn') continue;
    if (message.stop_reason === 'refusal') throw new RefusalError();
    const calls = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use',
    );
    if (message.stop_reason !== 'tool_use' || !calls.length) return;
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      const r = ctx.toolset
        ? await ctx.toolset.run(call.name, call.input)
        : await runTool(call.name, call.input, ctx);
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: r.content,
        is_error: r.isError,
      });
    }
    history.messages.push({ role: 'user', content: results });
  }
}

export class RefusalError extends Error {
  constructor() {
    super('refusal');
  }
}

export async function testClaude(p: ActiveProvider, signal: AbortSignal) {
  await client(p).beta.messages.create(
    { model: p.model, max_tokens: 64, messages: [{ role: 'user', content: 'Say OK.' }] },
    { signal },
  );
}

export { Anthropic };
