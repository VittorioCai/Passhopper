import { useTranslation } from 'react-i18next';
import { CURRENCIES, setCurrency, useFx, type Currency } from '../fx';
import { formatDate } from '../model/dates';
import { useLang } from '../lib';
import ui from './ui.module.css';

/** Pick a home currency for price hints next to EUR (F6.5). */
export function CurrencySetting() {
  const { t } = useTranslation();
  const lang = useLang();
  const { currency, date } = useFx(lang);
  const name = (c: Currency) => new Intl.DisplayNames(lang, { type: 'currency' }).of(c) ?? c;
  return (
    <div className={`${ui.card} ${ui.stack}`}>
      <label className={ui.field}>
        {t('fx.label')}
        <select
          value={currency ?? ''}
          onChange={(e) => setCurrency((e.target.value || null) as Currency | null)}
        >
          <option value="">{t('fx.off')}</option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} · {name(c)}
            </option>
          ))}
        </select>
      </label>
      <p className={ui.muted} style={{ fontSize: 13, margin: 0 }}>
        {currency && date
          ? t('fx.rateFrom', { date: formatDate(date, lang) })
          : currency
            ? t('fx.noRate')
            : t('fx.note')}
      </p>
    </div>
  );
}
