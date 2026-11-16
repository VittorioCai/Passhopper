import { BookOpenTextIcon, XIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import s from './Terms.module.css';

export const TERMS = ['travelDay', 'flexi', 'seat', 'home', 'ticket', 'continuous'] as const;
export type TermKey = (typeof TERMS)[number];

/** Explains one pass word in a sheet. */
function TermSheet({ term, onClose }: { term: TermKey; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet title={t(`terms.${term}.name`)} subtitle={t('terms.more')} onClose={onClose}>
      <p className={s.body}>{t(`terms.${term}.body`)}</p>
    </Sheet>
  );
}

/**
 * A pass word with a dotted underline; tapping it explains it. Never put one inside another
 * button or link.
 */
export function Term({ term, children }: { term: TermKey; children?: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={s.term}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title={t('terms.more')}
      >
        {children ?? t(`terms.${term}.name`)}
      </button>
      {open && <TermSheet term={term} onClose={() => setOpen(false)} />}
    </>
  );
}

const KEY = 'passhopper.termsSeen';
const seen = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** A card for first-timers with the five words that explain most of the app, until dismissed. */
export function TermsCard() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(seen);
  if (hidden) return null;
  return (
    <section className={s.card} aria-label={t('terms.cardTitle')}>
      <div className={s.head}>
        <BookOpenTextIcon size={22} weight="duotone" aria-hidden="true" />
        <span className={s.title}>
          {t('terms.cardTitle')}
          <small>{t('terms.cardBody')}</small>
        </span>
        <button
          type="button"
          className={s.close}
          aria-label={t('terms.gotIt')}
          onClick={() => {
            try {
              localStorage.setItem(KEY, '1');
            } catch {
              // Shown again next time; nothing else to do.
            }
            setHidden(true);
          }}
        >
          <XIcon size={16} weight="bold" />
        </button>
      </div>
      <div className={s.words}>
        {TERMS.filter((x) => x !== 'continuous').map((x) => (
          <Term key={x} term={x} />
        ))}
      </div>
    </section>
  );
}
