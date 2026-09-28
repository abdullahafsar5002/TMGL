import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

const themeColor = document.querySelector('meta[name="theme-color"]');
themeColor?.setAttribute('content', '#0B0F17');
const manifest = document.querySelector('link[rel="manifest"]');
if (manifest) {
  manifest.setAttribute('href', '/tmgl-manifest.webmanifest');
} else {
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = '/tmgl-manifest.webmanifest';
  document.head.appendChild(manifestLink);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
