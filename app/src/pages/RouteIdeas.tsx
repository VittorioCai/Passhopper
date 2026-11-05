import { CaretRightIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ui from '../components/ui.module.css';
import { ideaStats, ROUTE_IDEAS, type Tag } from '../data/routeIdeas';
import { countryName, lineStyle, useLang } from '../lib';
import s from './RouteIdeas.module.css';

const TAGS: Tag[] = ['first', 'scenic', 'budget', 'food', 'nature', 'long'];

/** Ready-made routes to learn from or start with. */
export function RouteIdeas() {
  const { t } = useTranslation();
  const lang = useLang();
  const zh = lang.startsWith('zh');
  const [tag, setTag] = useState<Tag | null>(null);
  const list = ROUTE_IDEAS.filter((r) => !tag || r.tags.includes(tag));
  return (
    <>
      <p className={ui.muted} style={{ margin: 0 }}>
        {t('ideas.intro')}
      </p>
      <div className={s.filters} role="group" aria-label={t('ideas.filter')}>
        <button type="button" aria-pressed={tag === null} onClick={() => setTag(null)}>
          {t('ideas.all')}
        </button>
        {TAGS.map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={tag === x}
            onClick={() => setTag(tag === x ? null : x)}
          >
            {t(`ideas.tag.${x}`)}
          </button>
        ))}
      </div>
      <ul className={s.list}>
        {list.map((r) => {
          const st = ideaStats(r);
          return (
            <li key={r.id}>
              <Link to={`/ideas/${r.id}`} className={s.card}>
                <span className={s.lines} aria-hidden="true">
                  {st.countries.map((cc) => (
                    <i key={cc} data-line style={lineStyle(cc)} />
                  ))}
                </span>
                <span className={s.title}>{zh ? r.title.zh : r.title.en}</span>
                <span className={s.summary}>{zh ? r.summary.zh : r.summary.en}</span>
                <span className={s.meta}>
                  {t('ideas.stats', { days: st.days, cities: st.cities, trains: st.trainDays })}
                  {' · '}
                  {st.countries.map((cc) => countryName(cc, lang)).join(zh ? '、' : ', ')}
                </span>
                <CaretRightIcon size={18} weight="bold" className={s.go} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
