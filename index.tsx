
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';

// Suppress known third-party library defaultProps warnings in React 18
const origError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('defaultProps will be removed from function components')) {
    return;
  }
  origError.apply(console, args);
};

const rootElement: HTMLElement | null = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

