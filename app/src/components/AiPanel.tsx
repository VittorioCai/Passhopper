import {
  ArrowUpIcon,
  ArrowCounterClockwiseIcon,
  CheckIcon,
  GlobeHemisphereWestIcon,
  MagicWandIcon,
  NotePencilIcon,
  SparkleIcon,
  StopIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { classifyError, newHistory, runTurn, type AiErrorKind, type History } from '../ai/agent';
import { applyPatch, type Comparison, type StopChange } from '../ai/patch';
import {
  activeProvider,
  isLocked,
  PROVIDERS,
  useAiSettings,
  type ActiveProvider,
} from '../ai/settings';
import { useVault } from '../ai/vault';
import { UnlockForm } from './UnlockForm';
import type { Activity, Proposal, Source } from '../ai/tools';
import { passById } from '../data/passes';
import { formatDate } from '../model/dates';
import type { Trip } from '../model/schema';
import { eur, placeName, useLang } from '../lib';
import { hostOf, Markdown } from './Markdown';
import { passName } from './passText';
import s from './AiPanel.module.css';

type ProposalState = 'pending' | 'applied' | 'dismissed' | 'failed';

interface UserItem {
  id: string;
  role: 'user';
  text: string;
}
interface AssistantItem {
  id: string;
  role: 'assistant';
  text: string;
  activities: Activity[];
  sources: Source[];
  proposals: string[];
  error?: { kind: AiErrorKind; detail?: string };
  done: boolean;
}
type Item = UserItem | AssistantItem;

/** Chat and proposals live in the trip layout, so they survive switching tabs. */
export interface AiChat {
  items: Item[];
  proposals: Record<string, { p: Proposal; state: ProposalState }>;
}
export const emptyChat = (): AiChat => ({ items: [], proposals: {} });

export interface ChatSession {
  get: (key: string) => History | undefined;
  set: (key: string, h: History) => History;
  reset: () => void;
}

export function AiPanel({
  trip,
  onApply,
  onClose,
  chat,
  setChat,
  session,
}: {
  trip: Trip;
  onApply: (next: Trip) => void;
  onClose: () => void;
  chat: AiChat;
  setChat: (fn: (c: AiChat) => AiChat) => void;
  /** The provider-side conversation, kept by the trip layout. */
  session: ChatSession;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const settings = useAiSettings(lang);
  const provider = activeProvider(settings);
  const locked = isLocked(settings, useVault());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const tripRef = useRef(trip);
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const patchItem = (id: string, fn: (a: AssistantItem) => AssistantItem) =>
    setChat((c) => ({
      ...c,
      items: c.items.map((i) => (i.id === id && i.role === 'assistant' ? fn(i) : i)),
    }));

  const send = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy || !provider) return;
    setText('');
    const p: ActiveProvider = provider;
    const key = `${p.id}:${p.model}`;
    const h = session.get(key) ?? session.set(key, newHistory(p));
    const aid = crypto.randomUUID();
    setChat((c) => ({
      ...c,
      items: [
        ...c.items,
        { id: crypto.randomUUID(), role: 'user', text: q },
        {
          id: aid,
          role: 'assistant',
          text: '',
          activities: [],
          sources: [],
          proposals: [],
          done: false,
        },
      ],
    }));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    try {
      await runTurn(
        p,
        h,
        tripRef.current,
        lang,
        q,
        {
          trip: () => tripRef.current,
          signal: ctrl.signal,
          searchKey: p.id === 'claude' ? undefined : p.searchKey,
          propose: (proposal) =>
            setChat((c) => ({
              ...c,
              // A newer proposal replaces any older one still waiting.
              proposals: {
                ...Object.fromEntries(
                  Object.entries(c.proposals).map(([k, v]) => [
                    k,
                    v.state === 'pending' ? { ...v, state: 'dismissed' as const } : v,
                  ]),
                ),
                [proposal.id]: { p: proposal, state: 'pending' },
              },
            })),
          activity: (a) =>
            patchItem(aid, (x) => ({
              ...x,
              activities: [...x.activities, a],
              proposals: a.type === 'proposal' ? [...x.proposals, a.id] : x.proposals,
            })),
          sources: (list) =>
            patchItem(aid, (x) => ({
              ...x,
              sources: [
                ...x.sources,
                ...list.filter((n) => !x.sources.some((o) => o.url === n.url)),
              ],
            })),
        },
        (delta) => patchItem(aid, (x) => ({ ...x, text: x.text + delta })),
      );
      patchItem(aid, (x) => ({ ...x, done: true }));
    } catch (err) {
      const e = await classifyError(err);
      // The conversation may now end halfway through a tool call; start the next turn afresh.
      session.reset();
      patchItem(aid, (x) => ({ ...x, done: true, error: e.kind === 'aborted' ? undefined : e }));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const decide = (id: string, apply: boolean) => {
    const entry = chat.proposals[id];
    if (!entry) return;
    if (!apply) {
      setChat((c) => ({
        ...c,
        proposals: { ...c.proposals, [id]: { ...entry, state: 'dismissed' } },
      }));
      return;
    }
    // Apply to the trip as it is now, in case it changed after the proposal was made.
    const { trip: next, errors } = applyPatch(trip, entry.p.patch);
    if (errors.length) {
      setChat((c) => ({
        ...c,
        proposals: { ...c.proposals, [id]: { ...entry, state: 'failed' } },
      }));
      return;
    }
    onApply(next);
    setChat((c) => ({ ...c, proposals: { ...c.proposals, [id]: { ...entry, state: 'applied' } } }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };
  const suggestions = [t('ai.sugCheaper'), t('ai.sugAddCity'), t('ai.sugSeats'), t('ai.sugNews')];

  return createPortal(
    <div className={s.layer} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={s.panel} role="dialog" aria-modal="true" aria-label={t('ai.title')}>
        <header className={s.head}>
          <span className={s.avatar}>
            <SparkleIcon size={18} weight="fill" />
          </span>
          <div className={s.headText}>
            <strong>{t('ai.title')}</strong>
            {provider && (
              <span>
                {PROVIDERS[provider.id].name} · {provider.model}
              </span>
            )}
          </div>
          {chat.items.length > 0 && (
            <button
              type="button"
              className={s.iconBtn}
              aria-label={t('ai.newChat')}
              title={t('ai.newChat')}
              disabled={busy}
              onClick={() => {
                session.reset();
                setChat(() => emptyChat());
              }}
            >
              <TrashIcon size={19} weight="bold" />
            </button>
          )}
          <button
            type="button"
            className={s.iconBtn}
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <XIcon size={20} weight="bold" />
          </button>
        </header>

        <div className={s.list} ref={listRef} aria-live="polite">
          {!provider && locked ? (
            <div className={s.empty}>
              <UnlockForm />
            </div>
          ) : !provider ? (
            <div className={s.empty}>
              <h3>{t('ai.setupTitle')}</h3>
              <p>{t('ai.setupBody')}</p>
              <Link to="/settings#ai" className={s.setupBtn} onClick={onClose}>
                {t('ai.openSettings')}
              </Link>
            </div>
          ) : chat.items.length === 0 ? (
            <div className={s.empty}>
              <h3>{t('ai.emptyTitle')}</h3>
              <ul className={s.abilities}>
                <li>
                  <MagicWandIcon size={22} weight="duotone" />
                  {t('ai.canChange')}
                </li>
                <li>
                  <NotePencilIcon size={22} weight="duotone" />
                  {t('ai.canExplain')}
                </li>
                <li>
                  <GlobeHemisphereWestIcon size={22} weight="duotone" />
                  {t('ai.canSearch')}
                </li>
              </ul>
              <p className={s.privacy}>{t('ai.privacy')}</p>
            </div>
          ) : (
            chat.items.map((item) =>
              item.role === 'user' ? (
                <div key={item.id} className={s.user}>
                  {item.text}
                </div>
              ) : (
                <div key={item.id} className={s.bot}>
                  {item.activities
                    .filter((a): a is Extract<Activity, { type: 'search' }> => a.type === 'search')
                    .map((a, i) => (
                      <div key={i} className={s.activity}>
                        <GlobeHemisphereWestIcon size={14} weight="bold" />
                        {t('ai.searched', { query: a.query })}
                      </div>
                    ))}
                  {item.text ? (
                    <div className={s.md}>
                      <Markdown text={item.text} />
                    </div>
                  ) : (
                    !item.done && (
                      <div className={s.typing} aria-label={t('ai.thinking')}>
                        <i />
                        <i />
                        <i />
                      </div>
                    )
                  )}
                  {item.proposals.map((id) => {
                    const entry = chat.proposals[id];
                    return entry ? (
                      <ChangeCard
                        key={id}
                        proposal={entry.p}
                        state={entry.state}
                        onApply={() => decide(id, true)}
                        onDismiss={() => decide(id, false)}
                      />
                    ) : null;
                  })}
                  {item.sources.length > 0 && item.done && (
                    <div className={s.sources}>
                      {item.sources.slice(0, 6).map((src) => (
                        <a
                          key={src.url}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                        >
                          {hostOf(src.url)}
                        </a>
                      ))}
                    </div>
                  )}
                  {item.error && (
                    <div className={s.error} role="alert">
                      {t(`ai.err.${item.error.kind}`)}
                      {item.error.kind === 'other' && item.error.detail && (
                        <code>{item.error.detail}</code>
                      )}
                    </div>
                  )}
                </div>
              ),
            )
          )}
        </div>

        {provider && (
          <footer className={s.foot}>
            {chat.items.length === 0 && (
              <div className={s.suggest}>
                {suggestions.map((q) => (
                  <button key={q} type="button" onClick={() => void send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <form className={s.composer} onSubmit={submit}>
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                maxLength={2000}
                placeholder={t('ai.placeholder')}
                aria-label={t('ai.placeholder')}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(text);
                  }
                }}
              />
              {busy ? (
                <button
                  type="button"
                  className={s.sendBtn}
                  aria-label={t('ai.stop')}
                  onClick={() => abortRef.current?.abort()}
                >
                  <StopIcon size={18} weight="fill" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={s.sendBtn}
                  aria-label={t('ai.send')}
                  disabled={!text.trim()}
                >
                  <ArrowUpIcon size={18} weight="bold" />
                </button>
              )}
            </form>
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}

function ChangeCard({
  proposal,
  state,
  onApply,
  onDismiss,
}: {
  proposal: Proposal;
  state: ProposalState;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const c: Comparison = proposal.comparison;
  const delta = Math.round(c.cost.after) - Math.round(c.cost.before);
  const passA = passById(c.passAfter);
  return (
    <div className={`${s.change} ${state !== 'pending' ? s.settled : ''}`}>
      <div className={s.changeTitle}>{proposal.patch.summary}</div>
      <ul className={s.changes}>
        {c.changes.map((ch, i) => (
          <li key={i} className={s[markClass(ch)]}>
            <i aria-hidden="true">
              {ch.kind === 'added' ? '+' : ch.kind === 'removed' ? '−' : '~'}
            </i>
            <span>{describe(ch, t, lang)}</span>
          </li>
        ))}
      </ul>
      {proposal.patch.warnings?.map((w, i) => (
        <p key={i} className={s.warn}>
          {w}
        </p>
      ))}
      <div className={s.costBar}>
        <span>
          {t('ai.total')} {eur(c.cost.before)} → <strong>{eur(c.cost.after)}</strong>
        </span>
        <span className={delta > 0 ? s.up : s.down}>
          {delta === 0 ? '±€0' : `${delta > 0 ? '+' : '−'}${eur(Math.abs(delta))}`}
        </span>
      </div>
      <div className={s.costSub}>
        {t('ai.daysChange', { before: c.days.before, after: c.days.after })}
        {passA && c.passAfter !== c.passBefore && <> · {passName(passA, t)}</>}
      </div>
      {state === 'pending' ? (
        <div className={s.changeBtns}>
          <button type="button" className={s.applyBtn} onClick={onApply}>
            <CheckIcon size={16} weight="bold" />
            {t('ai.apply')}
          </button>
          <button type="button" className={s.dismissBtn} onClick={onDismiss}>
            {t('ai.dismiss')}
          </button>
        </div>
      ) : (
        <div className={s.changeState}>{t(`ai.state.${state}`)}</div>
      )}
    </div>
  );
}

const markClass = (ch: StopChange) =>
  ch.kind === 'added' ? 'add' : ch.kind === 'removed' ? 'remove' : 'modify';

function describe(
  ch: StopChange,
  t: (k: string, o?: Record<string, unknown>) => string,
  lang: string,
) {
  switch (ch.kind) {
    case 'added':
      return t('ai.chAdded', { name: placeName(ch.name, lang), count: ch.nights });
    case 'removed':
      return t('ai.chRemoved', { name: placeName(ch.name, lang) });
    case 'nights':
      return t('ai.chNights', { name: placeName(ch.name, lang), from: ch.from, to: ch.to });
    case 'moved':
      return t('ai.chMoved', { name: placeName(ch.name, lang) });
    case 'trains':
      return t('ai.chTrains', {
        from: placeName(ch.from, lang),
        to: placeName(ch.to, lang),
        count: ch.count,
      });
    case 'note':
      return t('ai.chNote', { name: placeName(ch.name, lang) });
    case 'start':
      return t('ai.chStart', { from: formatDate(ch.from, lang), to: formatDate(ch.to, lang) });
  }
}

/** The bar shown after applying, with a way back. */
export function UndoToast({ onUndo, onDone }: { onUndo: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const timer = window.setTimeout(onDone, 10000);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <div className={s.toast} role="status">
      <CheckIcon size={16} weight="bold" />
      <span>{t('ai.applied')}</span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          onDone();
        }}
      >
        <ArrowCounterClockwiseIcon size={15} weight="bold" />
        {t('ai.undo')}
      </button>
    </div>
  );
}
