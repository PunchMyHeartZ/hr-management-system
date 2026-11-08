// ==============================
// จุดเริ่มต้นของแอปพลิเคชัน (entry point) — โหลด CSS, i18n และติดตั้ง AuthProvider
// ==============================
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import { AuthProvider } from './context/AuthContext';
import App from './App';

// Mount React เข้า DOM โดยห่อด้วย StrictMode และ AuthProvider เพื่อให้ทุกส่วนเข้าถึงสถานะ login ได้
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
