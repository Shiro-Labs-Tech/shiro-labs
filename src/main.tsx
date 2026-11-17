import './styles/styles.css';
import './styles/shots.css';
import './styles/site.css';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { startRuntime } from './folio/runtime';

startRuntime();
const root = document.getElementById('root')!;
const app = <BrowserRouter><App /></BrowserRouter>;
/* Prerendered pages are hydrated; the dev server starts empty and renders on the client. */
if (root.hasChildNodes()) hydrateRoot(root, app); else createRoot(root).render(app);
