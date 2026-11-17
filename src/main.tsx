import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/instrument-serif/400.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './App';
import { applyTheme, getTheme } from './theme';

applyTheme(getTheme());

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
