import type { Trip } from '../model/schema';
import { planForModel } from './patch';
import { systemPrompt, withPlan } from './prompt';
import type { ActiveProvider } from './settings';
import { HttpError, type ToolContext } from './tools';
import type { ClaudeHistory } from './claude';
import type { OpenAIHistory } from './openai';

export type History = ClaudeHistory | OpenAIHistory;

export const newHistory = (p: ActiveProvider): History =>
  p.id === 'claude' ? { kind: 'claude', messages: [] } : { kind: 'openai', messages: [] };

/**
 * Runs one turn: the user's message (with the current plan) and any tool calls that follow.
 * Provider code is loaded only when someone actually uses the assistant.
 */
export async function runTurn(
  p: ActiveProvider,
  history: History,
  trip: Trip,
  lang: string,
  text: string,
  ctx: ToolContext,
  onText: (delta: string) => void,
) {
  const message = withPlan(planForModel(trip), text);
  const system = systemPrompt(lang);
  if (history.kind === 'claude') {
    const { runClaudeTurn } = await import('./claude');
    await runClaudeTurn(p, history, system, message, ctx, onText);
  } else {
    const { runOpenAITurn } = await import('./openai');
    await runOpenAITurn(p, history, system, message, ctx, onText);
  }
}

export async function testConnection(p: ActiveProvider, signal: AbortSignal) {
  if (p.id === 'claude') {
    const { testClaude } = await import('./claude');
    await testClaude(p, signal);
  } else {
    const { testOpenAI } = await import('./openai');
    await testOpenAI(p, signal);
  }
}

export type AiErrorKind =
  'key' | 'balance' | 'rate' | 'model' | 'network' | 'refusal' | 'aborted' | 'other';

/** Sorts an error into something we can explain to the traveller. */
export async function classifyError(err: unknown): Promise<{ kind: AiErrorKind; detail?: string }> {
  if (err instanceof DOMException && err.name === 'AbortError') return { kind: 'aborted' };
  if (err instanceof Error && err.message === 'refusal') return { kind: 'refusal' };
  let status: number | undefined;
  let detail: string | undefined;
  if (err instanceof HttpError) {
    status = err.status;
    detail = err.body.slice(0, 300);
  } else {
    const { Anthropic } = await import('./claude');
    if (err instanceof Anthropic.APIUserAbortError) return { kind: 'aborted' };
    if (err instanceof Anthropic.APIConnectionError) return { kind: 'network' };
    if (err instanceof Anthropic.APIError) {
      status = err.status;
      detail = err.message.slice(0, 300);
    }
  }
  if (status === 401 || status === 403) return { kind: 'key', detail };
  if (status === 402) return { kind: 'balance', detail };
  if (status === 429) return { kind: 'rate', detail };
  if (status === 404) return { kind: 'model', detail };
  if (status === 400 && detail && /credit|balance/i.test(detail))
    return { kind: 'balance', detail };
  if (status === undefined && err instanceof TypeError) return { kind: 'network' };
  return { kind: 'other', detail: detail ?? (err instanceof Error ? err.message : String(err)) };
}
