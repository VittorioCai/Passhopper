import { DownloadSimpleIcon, ShareNetworkIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Plan } from '../engine/optimizer';
import type { Trip } from '../model/schema';
import { useLang } from '../lib';
import { canvasBlob, drawPoster, posterModel } from './poster';
import s from './PosterSheet.module.css';
import { Sheet } from './Sheet';
import ui from './ui.module.css';

type Picture =
  { state: 'making' } | { state: 'failed' } | { state: 'ready'; url: string; file: File };

/** Shows the trip as a tall picture, to share or download. */
export function PosterSheet({
  trip,
  plan,
  onClose,
}: {
  trip: Trip;
  plan: Plan | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [pic, setPic] = useState<Picture>({ state: 'making' });
  useEffect(() => {
    let url = '';
    let gone = false;
    drawPoster(posterModel(trip, plan, lang, t))
      .then(canvasBlob)
      .then((blob) => {
        if (gone) return;
        url = URL.createObjectURL(blob);
        const name = `${trip.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'trip'}.png`;
        setPic({ state: 'ready', url, file: new File([blob], name, { type: 'image/png' }) });
      })
      .catch(() => !gone && setPic({ state: 'failed' }));
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [trip, plan, lang, t]);
  const canShare =
    pic.state === 'ready' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [pic.file] });
  return (
    <Sheet title={t('poster.title')} subtitle={trip.name} onClose={onClose}>
      <div className={ui.stack}>
        {pic.state === 'making' && (
          <p className={ui.muted} role="status">
            {t('poster.making')}
          </p>
        )}
        {pic.state === 'failed' && (
          <p className={`${ui.status} ${ui.err}`} role="alert">
            {t('poster.failed')}
          </p>
        )}
        {pic.state === 'ready' && (
          <>
            <img className={s.img} src={pic.url} alt={t('poster.alt', { name: trip.name })} />
            <div className={ui.row}>
              {canShare && (
                <button
                  type="button"
                  className={ui.btnPrimary}
                  onClick={() => {
                    // Closing the share sheet rejects; nothing to do then.
                    navigator.share({ files: [pic.file], title: trip.name }).catch(() => {});
                  }}
                >
                  <ShareNetworkIcon size={18} weight="bold" />
                  {t('poster.share')}
                </button>
              )}
              <a
                className={canShare ? ui.btn : ui.btnPrimary}
                href={pic.url}
                download={pic.file.name}
              >
                <DownloadSimpleIcon size={18} weight="bold" />
                {t('poster.download')}
              </a>
            </div>
            <p className={ui.note}>{t('poster.hint')}</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
