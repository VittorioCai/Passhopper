import { CalendarBlankIcon, LightbulbIcon, PathIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { MapCard } from '../components/MapCard';
import ui from '../components/ui.module.css';
import { cityPlace, ideaById, ideaStats, previewTrip } from '../data/routeIdeas';
import { lineStyle, placeName, useLang } from '../lib';
import s from './RouteIdeas.module.css';

/** One route idea: map, cities with what to do, tips, and "Use this route". */
export function RouteIdea() {
  const { id } = useParams();
  const { t } = useTranslation();
  const lang = useLang();
  const zh = lang.startsWith('zh');
  const navigate = useNavigate();
  const idea = ideaById(id);
  const trip = useMemo(() => (idea ? previewTrip(idea, lang) : null), [idea, lang]);
  if (!idea || !trip) return <Navigate to="/ideas" replace />;
  const st = ideaStats(idea);
  const tx = (x: { en: string; zh: string }) => (zh ? x.zh : x.en);
  const origin = cityPlace(idea.origin);

  return (
    <>
      <div className={ui.stack} style={{ gap: 6 }}>
        <h1 className={ui.pageTitle}>{tx(idea.title)}</h1>
        <p className={ui.muted} style={{ margin: 0 }}>
          {tx(idea.summary)}
        </p>
        <p className={s.meta} style={{ margin: 0 }}>
          {t('ideas.stats', { days: st.days, cities: st.cities, trains: st.trainDays })}
        </p>
      </div>
      <MapCard trip={trip} lang={lang} />
      <section className={ui.card}>
        <ol className={s.stops}>
          <li>
            <span className={s.dot} data-line style={lineStyle(origin.country)} />
            <div>
              <b>{placeName(origin, lang)}</b>
              <p className={s.note}>{t('ideas.start')}</p>
            </div>
          </li>
          {idea.stops.map((x) => {
            const p = cityPlace(x.city);
            return (
              <li key={x.city}>
                <span className={s.dot} data-line style={lineStyle(p.country)} />
                <div>
                  <b>{placeName(p, lang)}</b>
                  <span className={s.nights}>{t('route.nights', { count: x.nights })}</span>
                  <p className={s.note}>{tx(x.note)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section className={`${ui.card} ${ui.stack}`}>
        <p className={s.fact}>
          <CalendarBlankIcon size={18} weight="duotone" />
          <span>
            <b>{t('ideas.best')}</b> {tx(idea.best)}
          </span>
        </p>
        {idea.tips.map((tip, i) => (
          <p key={i} className={s.fact}>
            <LightbulbIcon size={18} weight="duotone" />
            <span>{tx(tip)}</span>
          </p>
        ))}
      </section>
      <button
        type="button"
        className={`${ui.btnPrimary} ${ui.block}`}
        onClick={() => navigate('/new', { state: { idea: idea.id } })}
      >
        <PathIcon size={20} weight="bold" />
        {t('ideas.use')}
      </button>
      <p className={ui.muted} style={{ fontSize: 13, margin: 0 }}>
        {t('ideas.useNote')} <Link to="/ideas">{t('ideas.more')}</Link>
      </p>
    </>
  );
}
