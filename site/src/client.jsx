import { hydrateRoot } from 'react-dom/client';
import App from './App';
hydrateRoot(document.getElementById('root'), <App route={document.body.dataset.route} config={window.remoteSiteConfig} />);
