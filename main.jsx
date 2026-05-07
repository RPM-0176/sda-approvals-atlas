import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// ============================================================================
// Storage shim: replicates the window.storage API from Claude artifacts
// using the browser's localStorage so the same component code runs unchanged.
// ============================================================================
if (typeof window !== 'undefined' && !window.storage) {
  const PREFIX = 'sda-portal:';
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(PREFIX + key);
      if (v === null) return null;
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(PREFIX + key) !== null;
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },
    async list(prefix = '') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) {
          keys.push(k.slice(PREFIX.length));
        }
      }
      return { keys, prefix, shared: false };
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
