import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  DotsSixVerticalIcon,
  MoonIcon,
  PencilSimpleIcon,
  NotePencilIcon,
  PlusIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CityPicker } from '../components/CityPicker';
import { MapCard } from '../components/MapCard';
import { PassBar } from '../components/PassBar';
import { SegmentSheet } from '../components/SegmentSheet';
import { Sheet } from '../components/Sheet';
import { NoteSheet } from '../components/NoteSheet';
import { Stepper } from '../components/Stepper';
import { useTripContext } from '../components/TripContext';
import ui from '../components/ui.module.css';
import { findConflicts, type Conflict } from '../engine/conflicts';
import { useDragSort } from '../hooks/useDragSort';
import type { DayItem } from '../engine/days';
import type { DayChoice } from '../engine/optimizer';
import { formatDate, formatDuration } from '../model/dates';
import type { Segment, Trip } from '../model/schema';
import {
  addStop,
  canMove,
  destinationCount,
  isNightTrain,
  journeyFrom,
  moveStop,
  moveStopTo,
  removeStop,
  renameTrip,
  schedule,
  segmentCount,
  segmentMinutes,
  setNights,
  setNote,
  setStartDate,
  tripRange,
} from '../model/trip';
import { eurRange, feeText, lineStyle, placeName, useLang } from '../lib';
import r from './RoutePage.module.css';

export interface TicketInfo {
  item?: DayItem;
  choice?: DayChoice;
}

function TicketChips({ info }: { info: TicketInfo }) {
  const { t } = useTranslation();
  const { item, choice } = info;
  if (!item) return null;
  const onPass = choice === 'pass' && item.coverable;
  const chips: { cls: string | undefined; text: string }[] = [];
  if (!item.coverable) {
    chips.push({ cls: ui.chip, text: t('chip.ticket') });
    if (item.notCoveredReason === 'operator')
      chips.push({ cls: ui.chipMust, text: t('chip.notCovered') });
  } else
    chips.push(
      onPass
        ? { cls: ui.chipSun, text: t('chip.travelDay') }
        : { cls: ui.chip, text: t('chip.ticket') },
    );
  if (onPass && item.rule.reservation === 'mandatory')
    chips.push({
      cls: ui.chipMust,
      text: !item.rule.feeKnown
        ? t('chip.seatRequired')
        : item.rule.fee
          ? t('chip.seatRequiredFee', { fee: feeText(item.rule.fee, item.rule.feeMax) })
          : t('chip.seatRequiredFree'),
    });
  if (onPass && item.rule.reservation === 'recommended')
    chips.push({ cls: ui.chipRec, text: t('chip.seatAdvised') });
  if (item.rule.coverage === 'unknown') chips.push({ cls: ui.chipRec, text: t('chip.checkRules') });
  if (item.kind === 'outbound' || item.kind === 'inbound')
    chips.push({ cls: ui.chipInfo, text: t(`chip.${item.kind}`) });
  return (
    <span className={r.chips}>
      {chips.map((c) => (
        <span key={c.text} className={c.cls}>
          {c.text}
        </span>
      ))}
    </span>
  );
}

function Ticket({
  seg,
  country,
  info,
  onOpen,
}: {
  seg: Segment;
  country: string;
  info: TicketInfo;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const night = isNightTrain(seg);
  return (
    <button
      type="button"
      className={r.ticket}
      data-line
      style={lineStyle(country)}
      onClick={onOpen}
      aria-label={`${seg.trainNumber || t('route.train')}, ${seg.depTime}–${seg.arrTime}, ${seg.from} → ${seg.to}`}
    >
      <span className={r.tRow}>
        <span className={r.train}>
          {night && <MoonIcon size={13} weight="fill" aria-label={t('route.nightTrain')} />}
          {seg.trainNumber || t('route.train')}
        </span>
        <span className={r.times}>
          {seg.depTime}
          <span className={r.arr}>→</span>
          {seg.arrTime}
          {seg.arrDay > seg.depDay && <sup>+{seg.arrDay - seg.depDay}</sup>}
        </span>
        <span className={r.dur}>{formatDuration(segmentMinutes(seg), lang)}</span>
      </span>
      <span className={`${r.tRow} ${r.wrap}`}>
        <TicketChips info={info} />
        {seg.price ? (
          <span className={r.price}>
            <b>{eurRange(seg.price.min, seg.price.max)}</b>
            <span className={seg.price.source === 'user' ? ui.badgeUser : ui.badge}>
              {t(`source.${seg.price.source}`)}
            </span>
          </span>
        ) : (
          <span className={r.noPrice}>{t('route.addPrice')}</span>
        )}
      </span>
    </button>
  );
}

type SheetState =
  | { type: 'segment'; fromStopId: string; seg?: Segment }
  | { type: 'addCity' }
  | { type: 'note'; stopId: string }
  | null;

export function RoutePage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { trip, update, plan, analysis } = useTripContext();
  const [edit, setEdit] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const sched = schedule(trip);
  const range = tripRange(trip);
  const origin = trip.stops[0]!;
  const last = trip.stops[trip.stops.length - 1]!;
  const returnsHome = trip.stops.length > 2 && last.place.id === origin.place.id;
  const insertAt = returnsHome ? trip.stops.length - 1 : trip.stops.length;
  const conflicts = findConflicts(trip);
  const {
    bindList,
    handle: dragHandle,
    itemStyle,
  } = useDragSort((from, to) => update((x: Trip) => moveStopTo(x, x.stops[from]!.id, to)), 1);
  const conflictText = (c: Conflict) => {
    switch (c.type) {
      case 'overlap':
        return t('conflict.overlap', { prev: c.prev, next: c.next });
      case 'tight':
        return t('conflict.tight', { count: c.minutes, prev: c.prev, next: c.next });
      case 'many_changes':
        return t('conflict.manyChanges', { count: c.changes });
      case 'long_day':
        return t('conflict.longDay', { time: formatDuration(c.minutes, lang) });
      case 'missed_connection': {
        const stop = trip.stops.find((x) => x.id === c.stopId);
        return t('conflict.missed', { name: stop ? placeName(stop.place, lang) : '' });
      }
    }
  };
  const infoBySeg = new Map<string, TicketInfo>();
  for (const d of plan?.days ?? analysis.days) {
    for (const item of d.items)
      infoBySeg.set(item.seg.id, {
        item,
        choice: 'choice' in d ? (d.choice as DayChoice) : undefined,
      });
  }

  return (
    <>
      <PassBar
        extra={`${t('route.daysCount', { count: range.days })} · ${t('route.citiesCount', { count: destinationCount(trip) })} · ${t('route.trainsCount', { count: segmentCount(trip) })}`}
      />
      {edit && (
        <section className={`${ui.card} ${ui.grid2}`} aria-label={t('route.summary')}>
          <label className={ui.field}>
            {t('wizard.tripName')}
            <input
              defaultValue={trip.name}
              maxLength={120}
              onBlur={(e) =>
                e.target.value.trim() !== trip.name && update((x) => renameTrip(x, e.target.value))
              }
            />
          </label>
          <label className={ui.field}>
            {t('wizard.startDate')}
            <input
              type="date"
              value={trip.startDate}
              onChange={(e) => e.target.value && update((x) => setStartDate(x, e.target.value))}
            />
          </label>
        </section>
      )}

      <MapCard trip={trip} lang={lang} />

      <h2 className={`${ui.sectionTitle} ${ui.spread}`}>
        <span>
          {t('route.title')}
          <span className={r.range}>
            {formatDate(range.start, lang)} – {formatDate(range.end, lang)}
          </span>
        </span>
        <button
          type="button"
          className={ui.btnGhost}
          onClick={() => setEdit(!edit)}
          aria-pressed={edit}
        >
          {edit ? (
            <CheckIcon size={16} weight="bold" />
          ) : (
            <PencilSimpleIcon size={16} weight="bold" />
          )}
          {edit ? t('route.done') : t('route.edit')}
        </button>
      </h2>

      <ol className={r.timeline} ref={bindList}>
        {trip.stops.map((stop, i) => {
          const isFirst = i === 0;
          const isLast = i === trip.stops.length - 1;
          const j = journeyFrom(trip, stop.id);
          const prevCountry = i > 0 ? trip.stops[i - 1]!.place.country : stop.place.country;
          const sc = sched[i]!;
          const name = placeName(stop.place, lang);
          return (
            <li
              key={stop.id}
              className={`${r.stop} ${isFirst ? r.first : ''} ${isLast ? r.last : ''}`}
              data-drag-item
              style={edit ? itemStyle(i) : undefined}
            >
              <span
                className={r.rail}
                data-line
                style={lineStyle(stop.place.country)}
                aria-hidden="true"
              />
              {!isFirst && (
                <span
                  className={r.railIn}
                  data-line
                  style={lineStyle(prevCountry)}
                  aria-hidden="true"
                />
              )}
              <span
                className={`${r.dot} ${isFirst || isLast ? r.dotHome : ''}`}
                aria-hidden="true"
              />
              <div className={r.body}>
                <div className={r.head}>
                  <h3 className={r.city}>{name}</h3>
                  {stop.place.local !== name && <span className={r.local}>{stop.place.local}</span>}
                  <span className={r.when}>
                    {formatDate((isFirst ? sc.depart : sc.arrive) ?? trip.startDate, lang, {
                      weekday: true,
                    })}
                    {!isFirst && !edit && stop.nights > 0 && (
                      <span className={r.nights}>{t('route.nights', { count: stop.nights })}</span>
                    )}
                  </span>
                </div>
                {isFirst && <div className={r.note}>{t('route.start')}</div>}
                {isLast && stop.nights === 0 && <div className={r.note}>{t('route.end')}</div>}
                {stop.note ? (
                  <button
                    type="button"
                    className={r.cityNote}
                    onClick={() => setSheet({ type: 'note', stopId: stop.id })}
                    aria-label={t('note.editFor', { name })}
                  >
                    <NotePencilIcon size={15} weight="duotone" />
                    <span>{stop.note}</span>
                  </button>
                ) : (
                  edit && (
                    <button
                      type="button"
                      className={ui.btnGhost}
                      style={{ alignSelf: 'flex-start', padding: 0 }}
                      onClick={() => setSheet({ type: 'note', stopId: stop.id })}
                    >
                      <NotePencilIcon size={15} weight="bold" />
                      {t('note.add')}
                    </button>
                  )
                )}
                {edit && !isFirst && (
                  <div className={r.tools}>
                    <Stepper
                      value={stop.nights}
                      onChange={(n) => update((x) => setNights(x, stop.id, n))}
                      min={isLast ? 0 : 1}
                      label={t('route.nightsIn', { name })}
                      format={(n) => t('route.nights', { count: n })}
                    />
                    <span className={ui.row} style={{ gap: 6 }}>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        aria-label={t('route.drag', { name })}
                        title={t('route.drag', { name })}
                        {...dragHandle(i, trip.stops.length)}
                      >
                        <DotsSixVerticalIcon size={18} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        disabled={!canMove(trip, stop.id, -1)}
                        onClick={() => update((x) => moveStop(x, stop.id, -1))}
                        aria-label={t('route.moveUp', { name })}
                      >
                        <ArrowUpIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        disabled={!canMove(trip, stop.id, 1)}
                        onClick={() => update((x) => moveStop(x, stop.id, 1))}
                        aria-label={t('route.moveDown', { name })}
                      >
                        <ArrowDownIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        disabled={trip.stops.length <= 2}
                        onClick={() => update((x) => removeStop(x, stop.id))}
                        aria-label={t('route.remove', { name })}
                      >
                        <TrashIcon size={16} weight="bold" />
                      </button>
                    </span>
                  </div>
                )}
                {j && (
                  <div className={r.journey}>
                    {j.segments.map((seg) => (
                      <Ticket
                        key={seg.id}
                        seg={seg}
                        country={stop.place.country}
                        info={infoBySeg.get(seg.id) ?? {}}
                        onOpen={() => setSheet({ type: 'segment', fromStopId: stop.id, seg })}
                      />
                    ))}
                    {conflicts
                      .filter((c) => c.fromStopId === stop.id)
                      .map((c, k) => (
                        <p key={k} className={r.conflict} role="note">
                          <WarningIcon size={15} weight="fill" />
                          <span>{conflictText(c)}</span>
                        </p>
                      ))}
                    {j.segments.length === 0 ? (
                      <button
                        type="button"
                        className={r.addTrain}
                        onClick={() => setSheet({ type: 'segment', fromStopId: stop.id })}
                      >
                        <PlusIcon size={16} weight="bold" />
                        {t('route.addTrain', {
                          from: name,
                          to: placeName(trip.stops[i + 1]!.place, lang),
                        })}
                      </button>
                    ) : (
                      edit && (
                        <button
                          type="button"
                          className={ui.btnGhost}
                          style={{ alignSelf: 'flex-start' }}
                          onClick={() => setSheet({ type: 'segment', fromStopId: stop.id })}
                        >
                          <PlusIcon size={14} weight="bold" />
                          {t('route.addConnection')}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {edit && (
        <button
          type="button"
          className={`${ui.btn} ${ui.block}`}
          onClick={() => setSheet({ type: 'addCity' })}
        >
          <PlusIcon size={18} weight="bold" />
          {t('route.addCity')}
        </button>
      )}

      {sheet?.type === 'note' && (
        <NoteSheet
          trip={trip}
          stopId={sheet.stopId}
          onClose={() => setSheet(null)}
          onSave={(text) => {
            update((x: Trip) => setNote(x, sheet.stopId, text));
            setSheet(null);
          }}
        />
      )}
      {sheet?.type === 'addCity' && (
        <Sheet title={t('route.addCity')} onClose={() => setSheet(null)}>
          <CityPicker
            autoFocus
            onPick={(p) => {
              update((x: Trip) => addStop(x, p, insertAt, 2));
              setSheet(null);
            }}
          />
        </Sheet>
      )}
      {sheet?.type === 'segment' && (
        <SegmentSheet
          trip={trip}
          fromStopId={sheet.fromStopId}
          segment={sheet.seg}
          onClose={() => setSheet(null)}
          onSave={(fn) => {
            update(fn);
            setSheet(null);
          }}
        />
      )}
    </>
  );
}
