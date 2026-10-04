import { renderToString } from 'react-dom/server';
import App from './App';
export function render(route, config) { return renderToString(<App route={route} config={config} />); }
export { validConfig } from './Beta';
