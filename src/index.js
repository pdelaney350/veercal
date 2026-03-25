import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
const path = window.location.pathname;
if (path === '/compare') {
  root.render(<QuickCompare />);
} else {
  root.render(<App />);
}