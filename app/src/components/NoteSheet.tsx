import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Trip } from '../model/schema';
import { placeName, useLang } from '../lib';
import { Sheet } from './Sheet';
import ui from './ui.module.css';

/** Notes for one city: where you sleep, what to do (F1.9). */
export function NoteSheet({
  trip,
  stopId,
  onClose,
  onSave,
}: {
  trip: Trip;
  stopId: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const stop = trip.stops.find((s) => s.id === stopId)!;
  const [text, setText] = useState(stop.note ?? '');
  return (
    <Sheet title={placeName(stop.place, lang)} subtitle={t('note.title')} onClose={onClose}>
      <form
        className={ui.stack}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(text);
        }}
      >
        <label className={ui.field}>
          {t('note.label')}
          <textarea
            rows={5}
            maxLength={500}
            value={text}
            placeholder={t('note.placeholder')}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className={ui.row}>
          <button type="submit" className={ui.btnPrimary}>
            {t('common.save')}
          </button>
          {stop.note && (
            <button
              type="button"
              className={ui.btnGhost}
              style={{ color: 'var(--danger)' }}
              onClick={() => onSave('')}
            >
              {t('note.delete')}
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
