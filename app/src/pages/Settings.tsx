import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ui from '../components/ui.module.css';
import { LANGUAGES, setLanguage, type Language } from '../i18n';
import { applyTheme, readTheme, type Theme } from '../theme';

const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', 'zh-CN': '简体中文' };

export function Settings() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>(readTheme);
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
