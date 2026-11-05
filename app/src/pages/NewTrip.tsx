import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsSixVerticalIcon,
  InfoIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { AiDraftBox } from '../components/AiDraftBox';
import { CityPicker } from '../components/CityPicker';
import { Stepper } from '../components/Stepper';
import ui from '../components/ui.module.css';
import { COUNTRY_CODES, type CountryCode } from '../data/countries';
import { saveTrip } from '../db/trips';
import { cityPlace, ideaById } from '../data/routeIdeas';
import { useDragSort } from '../hooks/useDragSort';
import { addDays, todayLocal } from '../model/dates';
import type { Place, Traveller } from '../model/schema';
import { createTrip } from '../model/trip';
import { countryName, lineStyle, placeName, useLang } from '../lib';
import w from './NewTrip.module.css';

type Age = Traveller['ageGroup'];

export function NewTrip() {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [resType, setResType] = useState<'europe' | 'non_europe'>('europe');
  const [country, setCountry] = useState<CountryCode>('DE');
  const [age, setAge] = useState<Age>('youth');
  const [cls, setCls] = useState<1 | 2>(2);
  const [count, setCount] = useState(1);
  const idea = ideaById((useLocation().state as { idea?: string } | null)?.idea);
  const zh = lang.startsWith('zh');
  const [origin, setOrigin] = useState<Place | null>(idea ? cityPlace(idea.origin) : null);
  const [stops, setStops] = useState<{ place: Place; nights: number; note?: string }[]>(
    idea
      ? idea.stops.map((x) => ({
          place: cityPlace(x.city),
          nights: x.nights,
          note: zh ? x.note.zh : x.note.en,
        }))
      : [],
  );
  const [returnToStart, setReturnToStart] = useState(!idea);
  const [startDate, setStartDate] = useState(addDays(todayLocal(), 30));
  const [name, setName] = useState(idea ? (zh ? idea.title.zh : idea.title.en) : '');

  const autoName =
    origin && stops.length
      ? `${placeName(origin, lang)} → ${placeName(stops[stops.length - 1]!.place, lang)}`
      : '';
  const canNext = step === 1 || (step === 2 && !!origin && stops.length > 0) || step === 3;
  const {
    bindList,
    handle: dragHandle,
    itemStyle,
  } = useDragSort((from, to) =>
    setStops((list) => {
      const n = [...list];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x!);
      return n;
    }),
  );
  const move = (i: number, d: -1 | 1) =>
    setStops((s) => {
      const n = [...s];
      [n[i], n[i + d]] = [n[i + d]!, n[i]!];
      return n;
    });

  const create = async () => {
    if (!origin || !stops.length || !startDate) return;
    const trip = createTrip({
      name: name.trim() || autoName,
      traveller: {
        residence: resType === 'europe' ? { type: 'europe', country } : { type: 'non_europe' },
        ageGroup: age,
        travelClass: cls,
        count,
      },
      startDate,
      places: [origin, ...stops.map((s) => s.place)],
      nights: stops.map((s) => s.nights),
      returnToStart,
    });
    // Notes from a route idea go with their cities.
    stops.forEach((x, i) => {
      if (x.note) trip.stops[i + 1]!.note = x.note.slice(0, 500);
    });
    await saveTrip(trip);
    navigate(`/trip/${trip.id}/route`, { replace: true });
  };

  const seg = <T extends string | number>(
    value: T,
    set: (v: T) => void,
    opts: [T, string][],
    label: string,
  ) => (
    <div className={ui.segCtl} role="group" aria-label={label}>
      {opts.map(([v, l]) => (
        <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)}>
          {l}
        </button>
      ))}
    </div>
  );
  const titles = ['', t('wizard.aboutYou'), t('wizard.whereTo'), t('wizard.when')];

  return (
    <>
      <div className={ui.stack} style={{ gap: 8 }}>
        <div className={ui.progress} aria-hidden="true">
          <i style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        <span className={ui.stepLabel}>{t('wizard.step', { step, total: 3 })}</span>
        <h1 className={ui.pageTitle}>{titles[step]}</h1>
      </div>

      {step === 1 && (
        <div className={`${ui.card} ${ui.stack}`} style={{ gap: 18 }}>
          <div className={ui.stack}>
            <span className={ui.label}>{t('wizard.residence')}</span>
            {seg(
              resType,
              setResType,
              [
                ['europe', t('wizard.inEurope')],
                ['non_europe', t('wizard.outsideEurope')],
              ],
              t('wizard.residence'),
            )}
            {resType === 'europe' && (
              <label className={ui.field}>
                {t('wizard.country')}
                <select value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}>
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc} value={cc}>
                      {countryName(cc, lang)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className={w.hint}>
              <InfoIcon size={18} weight="duotone" aria-hidden="true" />
              {resType === 'europe' ? t('wizard.homeRule') : t('wizard.noHomeRule')}
            </p>
          </div>
          <div className={ui.stack}>
            <span className={ui.label}>{t('wizard.age')}</span>
            {seg(
              age,
              setAge,
              [
                ['youth', t('wizard.youth')],
                ['adult', t('wizard.adult')],
                ['senior', t('wizard.senior')],
              ],
              t('wizard.age'),
            )}
          </div>
          <div className={ui.stack}>
            <span className={ui.label}>{t('wizard.class')}</span>
            {seg(
              cls,
              setCls,
              [
                [2, t('wizard.second')],
                [1, t('wizard.first')],
              ],
              t('wizard.class'),
            )}
          </div>
          <div className={ui.spread}>
            <span className={ui.label}>{t('wizard.travellers')}</span>
            <Stepper
              value={count}
              onChange={setCount}
              min={1}
              max={9}
              label={t('wizard.travellers')}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={`${ui.card} ${ui.stack}`} style={{ gap: 16 }}>
          <p className={ui.muted} style={{ margin: 0, fontSize: 14 }}>
            {t('ideas.browseHint')} <Link to="/ideas">{t('ideas.browse')}</Link>
          </p>
          <AiDraftBox
            onDraft={(d) => {
              setOrigin(d.origin);
              setStops(d.stops);
              setReturnToStart(d.returnToStart);
              if (d.startDate) setStartDate(d.startDate);
            }}
          />
          <div className={ui.stack}>
            <span className={ui.label}>{t('wizard.startFrom')}</span>
            {origin ? (
              <div className={w.place}>
                <span className={ui.cc} data-line style={lineStyle(origin.country)}>
                  {origin.country}
                </span>
                <b className={ui.grow}>{placeName(origin, lang)}</b>
                <button
                  type="button"
                  className={ui.iconBtn}
                  onClick={() => setOrigin(null)}
                  aria-label={t('wizard.change')}
                >
                  <XIcon size={16} weight="bold" />
                </button>
              </div>
            ) : (
              <CityPicker onPick={setOrigin} autoFocus />
            )}
          </div>
          {origin && (
            <div className={ui.stack}>
              <span className={ui.label}>{t('wizard.stops')}</span>
              {stops.length > 0 && (
                <ol className={w.list} ref={bindList}>
                  {stops.map((s, i) => (
                    <li
                      key={`${s.place.id}-${i}`}
                      className={w.place}
                      data-drag-item
                      style={itemStyle(i)}
                    >
                      <button
                        type="button"
                        className={ui.iconBtn}
                        aria-label={t('route.drag', { name: placeName(s.place, lang) })}
                        {...dragHandle(i, stops.length)}
                      >
                        <DotsSixVerticalIcon size={18} weight="bold" />
                      </button>
                      <span className={w.num}>{i + 1}</span>
                      <span className={ui.cc} data-line style={lineStyle(s.place.country)}>
                        {s.place.country}
                      </span>
                      <b className={ui.grow}>{placeName(s.place, lang)}</b>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={t('route.moveUp', { name: placeName(s.place, lang) })}
                      >
                        <ArrowUpIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        disabled={i === stops.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={t('route.moveDown', { name: placeName(s.place, lang) })}
                      >
                        <ArrowDownIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        onClick={() => setStops((x) => x.filter((_, j) => j !== i))}
                        aria-label={t('route.remove', { name: placeName(s.place, lang) })}
                      >
                        <XIcon size={16} weight="bold" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <CityPicker onPick={(p) => setStops((x) => [...x, { place: p, nights: 2 }])} />
              <label className={ui.check}>
                <input
                  type="checkbox"
                  checked={returnToStart}
                  onChange={(e) => setReturnToStart(e.target.checked)}
                />
                {t('wizard.returnTo', { name: placeName(origin, lang) })}
              </label>
            </div>
          )}
        </div>
      )}

      {step === 3 && origin && (
        <div className={`${ui.card} ${ui.stack}`} style={{ gap: 16 }}>
          <label className={ui.field}>
            {t('wizard.startDate')}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <div className={ui.stack}>
            <span className={ui.label}>{t('wizard.nightsEach')}</span>
            {stops.map((s, i) => (
              <div key={`${s.place.id}-${i}`} className={ui.spread}>
                <b>{placeName(s.place, lang)}</b>
                <Stepper
                  value={s.nights}
                  onChange={(n) =>
                    setStops((x) => x.map((y, j) => (j === i ? { ...y, nights: n } : y)))
                  }
                  min={i === stops.length - 1 && !returnToStart ? 0 : 1}
                  label={t('route.nightsIn', { name: placeName(s.place, lang) })}
                  format={(n) => t('route.nights', { count: n })}
                />
              </div>
            ))}
          </div>
          <label className={ui.field}>
            {t('wizard.tripName')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={autoName}
              maxLength={120}
            />
          </label>
        </div>
      )}

      <div className={ui.spread}>
        {step > 1 ? (
          <button type="button" className={ui.btn} onClick={() => setStep(step - 1)}>
            {t('common.back')}
          </button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <button
            type="button"
            className={ui.btnInk}
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
          >
            {t('wizard.next')}
          </button>
        ) : (
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={!startDate}
            onClick={() => void create()}
          >
            {t('wizard.create')}
          </button>
        )}
      </div>
      {step === 2 && !canNext && origin && <p className={ui.muted}>{t('wizard.needStop')}</p>}
    </>
  );
}
