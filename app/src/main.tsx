import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource/dm-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';
import i18n from './i18n';
import { seedSampleOnce } from './db/trips';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { applyTheme, readTheme } from './theme';

applyTheme(readTheme());
void seedSampleOnce(i18n.language).catch(() => {
  // Storage can be unavailable (some private modes). The app still works for this visit.
});

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
