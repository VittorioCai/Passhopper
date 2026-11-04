import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiSettingsCard } from '../components/AiSettings';
import ui from '../components/ui.module.css';
import { deleteEverything, exportAll, importFile } from '../db/trips';
import { LANGUAGES, setLanguage, type Language } from '../i18n';
import { todayLocal } from '../model/dates';
import { applyTheme, readTheme, type Theme } from '../theme';

const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', 'zh-CN': '简体中文' };

export function Settings() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `passhopper-trips-${todayLocal()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus({ ok: true, text: t('settings.exported', { count: data.trips.length }) });
  };
  const doImport = async (file: File) => {
    const res = await importFile(await file.text());
    setStatus(
      res.ok
        ? { ok: true, text: t('settings.imported', { count: res.count }) }
        : {
            ok: false,
            text: t(res.error === 'not_json' ? 'settings.importNotJson' : 'settings.importInvalid'),
          },
    );
  };
  const themes: [Theme, string][] = [
    ['system', t('settings.themeSystem')],
    ['light', t('settings.themeLight')],
    ['dark', t('settings.themeDark')],
  ];
  return (
    <>
      <h2 className={ui.sectionTitle}>{t('settings.language')}</h2>
      <div className={ui.card}>
        <div className={ui.segCtl} role="group" aria-label={t('settings.language')}>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={i18n.language === l}
              onClick={() => void setLanguage(l)}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </div>
      <h2 className={ui.sectionTitle}>{t('settings.appearance')}</h2>
      <div className={ui.card}>
        <div className={ui.segCtl} role="group" aria-label={t('settings.appearance')}>
          {themes.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={theme === v}
              onClick={() => {
                applyTheme(v);
                setTheme(v);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <h2 className={ui.sectionTitle}>{t('ai.settingsTitle')}</h2>
      <AiSettingsCard />
      <h2 className={ui.sectionTitle}>{t('settings.data')}</h2>
      <div className={`${ui.card} ${ui.stack}`}>
        <p className={ui.muted}>{t('settings.dataNote')}</p>
        <div className={ui.row}>
          <button type="button" className={ui.btnSm} onClick={() => void doExport()}>
            <DownloadSimpleIcon size={16} weight="bold" />
            {t('settings.export')}
          </button>
          <button type="button" className={ui.btnSm} onClick={() => fileRef.current?.click()}>
            <UploadSimpleIcon size={16} weight="bold" />
            {t('settings.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {status && (
          <p className={`${ui.status} ${status.ok ? ui.ok : ui.err}`} role="status">
            {status.text}
          </p>
        )}
        {confirm ? (
          <div className={ui.danger}>
            <span>{t('settings.deleteAllConfirm')}</span>
            <div className={ui.row}>
              <button
                type="button"
                className={ui.btnDanger}
                onClick={async () => {
                  await deleteEverything();
                  setConfirm(false);
                  setStatus({ ok: true, text: t('settings.deletedAll') });
                }}
              >
                {t('settings.deleteAllYes')}
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
            style={{ color: 'var(--danger)', alignSelf: 'flex-start', padding: 0 }}
            onClick={() => setConfirm(true)}
          >
            {t('settings.deleteAll')}
          </button>
        )}
      </div>
      <h2 className={ui.sectionTitle}>{t('settings.about')}</h2>
      <div className={ui.card}>
        <p className={ui.muted}>
          {t('settings.source')}:{' '}
          <a
            href="https://github.com/VittorioCai/Passhopper"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/VittorioCai/Passhopper
          </a>
        </p>
      </div>
    </>
  );
}
