import { XIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import s from './Sheet.module.css';

/** Bottom sheet on phones, centred dialog on wider screens. Closes on Esc or a tap outside. */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([data-close])',
    );
    first?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={s.grabber} />
        <div className={s.head}>
          <div>
            <h2 id={titleId} className={s.title}>
              {title}
            </h2>
            {subtitle && <div className={s.sub}>{subtitle}</div>}
          </div>
          <button
            type="button"
            className={s.close}
            onClick={onClose}
            aria-label={t('common.close')}
            data-close
          >
            <XIcon size={20} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
