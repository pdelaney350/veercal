import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import QuickCompare from './QuickCompare';

const path = window.location.pathname;
const root = ReactDOM.createRoot(document.getElementById('root'));

if (path === '/compare' || path.startsWith('/compare/')) {
  root.render(<QuickCompare />);
} else {
  root.render(<App />);
}