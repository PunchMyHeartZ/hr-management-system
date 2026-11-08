// ==============================
// ปุ่มสลับภาษา ไทย/อังกฤษ — เปลี่ยนค่า i18n และจำไว้ใน localStorage
// ==============================
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  // เปลี่ยนภาษา + จำการเลือกไว้ใน localStorage + ตั้ง lang ของ <html> เพื่อ accessibility
  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
    document.documentElement.lang = lng;
  };

  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Language">
      {[
        { code: 'th', label: 'ไทย' },
        { code: 'en', label: 'EN' },
      ].map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => change(code)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            i18n.language === code
              ? 'bg-azure-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
