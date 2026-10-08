import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles.css';
const GOOGLE_CLIENT_ID = '447281945589-a8kat0vbrfqplaru8s8mjqo8kus2n536.apps.googleusercontent.com';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            background: '#1c2b24',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          },
          success: { iconTheme: { primary: '#1cc29f', secondary: '#fff' } },
          error: { iconTheme: { primary: '#e5484d', secondary: '#fff' } },
        }}
      />
    </GoogleOAuthProvider>
  </React.StrictMode>
);