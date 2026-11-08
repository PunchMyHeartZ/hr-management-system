// ==============================
// การตั้งค่า i18n (react-i18next) — โหลดไฟล์แปล en/th และกำหนดภาษาเริ่มต้น
// ==============================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import th from './locales/th.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    th: { translation: th },
  },
  // ใช้ภาษาที่ผู้ใช้เลือกไว้ใน localStorage ถ้าไม่มีให้เริ่มที่ภาษาไทย
  lng: localStorage.getItem('lang') || 'th',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
