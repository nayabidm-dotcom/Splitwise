import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-center" toastOptions={{
      duration: 2500,
      style: { background: '#1c2b24', color: '#fff', borderRadius: '12px', padding: '12px 18px', fontSize: '14px', fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
      success: { iconTheme: { primary: '#1cc29f', secondary: '#fff' } },
      error: { iconTheme: { primary: '#e5484d', secondary: '#fff' } },
    }} />
  </React.StrictMode>
);