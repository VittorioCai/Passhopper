import { TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentSchema, type Segment, type Trip } from '../model/schema';
import { journeyFrom, newId, removeSegment, upsertSegment } from '../model/trip';
import { placeName, useLang } from '../lib';
import { Sheet } from './Sheet';
import ui from './ui.module.css';

/** Add or edit one train by hand. Timetable search plugs in here once Transitous is reachable. */
export function SegmentSheet({
  trip,
  fromStopId,
  segment,
  onClose,
  onSave,
}: {
  trip: Trip;
  fromStopId: string;
  segment?: Segment;
  onClose: () => void;
  onSave: (fn: (t: Trip) => Trip) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const idx = trip.stops.findIndex((s) => s.id === fromStopId);
  const from = trip.stops[idx]!;
  const to = trip.stops[idx + 1]!;
  const prev = journeyFrom(trip, fromStopId)?.segments.at(-1);
  const [trainNumber, setTrainNumber] = useState(segment?.trainNumber ?? '');
  const [fromSt, setFromSt] = useState(segment?.from ?? (prev ? prev.to : from.place.local));
  const [toSt, setToSt] = useState(segment?.to ?? to.place.local);
  const [depTime, setDepTime] = useState(segment?.depTime ?? '');
  const [arrTime, setArrTime] = useState(segment?.arrTime ?? '');
  const [depNext, setDepNext] = useState((segment?.depDay ?? prev?.arrDay ?? 0) > 0);
  const [arrNext, setArrNext] = useState(segment ? segment.arrDay > segment.depDay : false);
  const [price, setPrice] = useState(segment?.price ? String(segment.price.max) : '');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const save = () => {
    const depDay = depNext ? 1 : 0;
    const p = price.trim() ? Number(price) : undefined;
    if (p !== undefined && !(p >= 0)) return setError(t('segment.badPrice'));
    const keepPrice =
      segment?.price &&
      p !== undefined &&
      Math.round(segment.price.max) === p &&
      segment.price.min !== segment.price.max;
    const candidate: Segment = {
      id: segment?.id ?? newId(),
      trainNumber: trainNumber.trim(),
      from: fromSt.trim(),
      to: toSt.trim(),
      depDay,
      depTime,
      arrDay: depDay + (arrNext ? 1 : 0),
      arrTime,
      source: segment?.source ?? 'manual',
      ...(p === undefined
        ? {}
        : {
            price: keepPrice
              ? segment!.price!
              : { min: p, max: p, currency: 'EUR' as const, source: 'user' as const },
          }),
    };
    const res = SegmentSchema.safeParse(candidate);
    if (!res.success) {
      return setError(!depTime || !arrTime ? t('segment.needTimes') : t('segment.arriveAfter'));
    }
    onSave((x) => upsertSegment(x, fromStopId, res.data));
  };

  return (
    <Sheet
      title={`${placeName(from.place, lang)} → ${placeName(to.place, lang)}`}
      subtitle={segment ? t('segment.editTitle') : t('segment.addTitle')}
      onClose={onClose}
    >
      <p className={ui.muted} style={{ fontSize: 14 }}>
        {t('segment.manualNote')}
      </p>
      <form
        className={ui.stack}
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className={ui.field}>
          {t('segment.train')}
          <input
            value={trainNumber}
            onChange={(e) => setTrainNumber(e.target.value)}
            placeholder="ICE 1005"
            maxLength={40}
          />
        </label>
        <div className={ui.grid2}>
          <label className={ui.field}>
            {t('segment.from')}
            <input value={fromSt} onChange={(e) => setFromSt(e.target.value)} maxLength={80} />
          </label>
          <label className={ui.field}>
            {t('segment.to')}
            <input value={toSt} onChange={(e) => setToSt(e.target.value)} maxLength={80} />
          </label>
          <label className={ui.field}>
            {t('segment.departs')}
            <input
              type="time"
              value={depTime}
              onChange={(e) => setDepTime(e.target.value)}
              required
            />
          </label>
          <label className={ui.field}>
            {t('segment.arrives')}
            <input
              type="time"
              value={arrTime}
              onChange={(e) => setArrTime(e.target.value)}
              required
            />
          </label>
        </div>
        <label className={ui.check}>
          <input type="checkbox" checked={arrNext} onChange={(e) => setArrNext(e.target.checked)} />
          {t('segment.arrivesNextDay')}
        </label>
        {(prev || depNext) && (
          <label className={ui.check}>
            <input
              type="checkbox"
              checked={depNext}
              onChange={(e) => setDepNext(e.target.checked)}
            />
            {t('segment.departsNextDay')}
          </label>
        )}
        <label className={ui.field}>
          {t('segment.price')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="€"
          />
        </label>
        {error && (
          <p className={ui.fieldError} role="alert">
            {error}
          </p>
        )}
        <div className={ui.row}>
          <button type="submit" className={ui.btnPrimary}>
            {t('common.save')}
          </button>
          <button type="button" className={ui.btn} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
      {segment &&
        (confirm ? (
          <div className={ui.danger}>
            <span>{t('segment.deleteConfirm')}</span>
            <div className={ui.row}>
              <button
                type="button"
                className={ui.btnDanger}
                onClick={() => onSave((x) => removeSegment(x, fromStopId, segment.id))}
              >
                {t('common.delete')}
              </button>
              <button type="button" className={ui.btn} onClick={() => setConfirm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={ui.btnGhost}
            style={{ color: 'var(--danger)', alignSelf: 'flex-start' }}
            onClick={() => setConfirm(true)}
          >
            <TrashIcon size={16} weight="bold" />
            {t('segment.delete')}
          </button>
        ))}
    </Sheet>
  );
}
