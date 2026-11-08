// ==============================
// หน้าเข้าสู่ระบบ/สมัครสมาชิก — ฟอร์ม login + register (เลือก role HR/Executive) พร้อมแผงโปรโมทด้านซ้าย
// ==============================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, IdCard, Briefcase, Crown, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerFormSchema, firstIssueMessage } from '../api/schemas';
import type { UserRole } from '../api/schemas';
import LanguageSwitcher from '../components/LanguageSwitcher';

const inputWrapCls =
  'flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/25';
const inputCls = 'w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400';

// role ที่เลือกได้ตอนสมัคร (พร้อมไอคอนประจำ role)
const ROLES: { value: UserRole; icon: LucideIcon }[] = [
  { value: 'hr', icon: Briefcase },
  { value: 'executive', icon: Crown },
];

// จุดเด่นของระบบที่แสดงในแผงโปรโมท (hero) ด้านซ้าย
const HERO_POINTS: { icon: LucideIcon; key: string }[] = [
  { icon: User, key: 'hero.employees' },
  { icon: Lock, key: 'hero.leave' },
  { icon: Waves, key: 'hero.payroll' },
];

interface RegisterForm {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

/** หน้าจอ authentication — สลับโหมด login/register ได้ และ validate ฟอร์มสมัครด้วย zod */
export default function AuthPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  // ส่วน state: โหมด (login/register), ค่าฟอร์ม, error, สถานะกำลังส่ง
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState<RegisterForm>({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'hr',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ส่วน event handlers: ผูก input กับ state, submit ฟอร์ม และสลับโหมด
  const set = (key: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        // โหมดสมัคร: ตรวจฟอร์มด้วย zod ก่อนส่ง
        const parsed = registerFormSchema.safeParse(form);
        if (!parsed.success) {
          setError(firstIssueMessage(parsed.error));
          return;
        }
        await register(parsed.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setError(null);
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-[#EFF7FE] to-blue-200 p-4">
      {/* ส่วนวงกลมแสงตกแต่งพื้นหลัง (blob) */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-azure-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-10 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />

      {/* ปุ่มสลับภาษามุมขวาบน */}
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* การ์ดหลัก: แผงโปรโมท (ซ้าย) + ฟอร์ม (ขวา) */}
      <div className="fade-up relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl shadow-azure-900/10 md:grid-cols-[1.05fr_1fr]">
        {/* แผงโปรโมท (hero) แสดงเฉพาะจอกลางขึ้นไป */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-sky-400 to-azure-600 p-10 text-white md:flex md:flex-col md:justify-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/35 bg-white/15 text-sm font-extrabold backdrop-blur">
            HR
          </div>
          <h2 className="relative text-2xl font-extrabold leading-snug">
            {t('auth.heroTitle')}
          </h2>
          <p className="relative mt-3 text-sm leading-relaxed text-white/80">
            {t('auth.heroSubtitle')}
          </p>
          <ul className="relative mt-8 space-y-4">
            {HERO_POINTS.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* ส่วนฟอร์ม login/register */}
        <div className="p-8 sm:p-10">
          {/* หัวข้อ + โลโก้ (mobile) */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-azure-600 text-sm font-extrabold text-white shadow-lg shadow-azure-600/30 md:hidden">
              HR
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>

          {/* ฟอร์มหลัก */}
          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            {/* ช่องเพิ่มเติมของโหมดสมัคร: ชื่อ-นามสกุล + ชื่อผู้ใช้ */}
            {mode === 'register' && (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">{t('auth.fullName')} *</span>
                  <div className={inputWrapCls}>
                    <IdCard className="h-4 w-4 shrink-0 text-slate-400" />
                    <input required value={form.full_name} onChange={set('full_name')} className={inputCls} />
                  </div>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">{t('auth.username')} *</span>
                  <div className={inputWrapCls}>
                    <User className="h-4 w-4 shrink-0 text-slate-400" />
                    <input required minLength={3} value={form.username} onChange={set('username')} className={inputCls} />
                  </div>
                </label>
              </>
            )}

            {/* อีเมล (login ใช้ type text เพราะรองรับ username ด้วย) + รหัสผ่าน */}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{t('auth.email')} *</span>
              <div className={inputWrapCls}>
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  required
                  type={mode === 'login' ? 'text' : 'email'}
                  value={form.email}
                  onChange={set('email')}
                  className={inputCls}
                  placeholder={mode === 'login' ? 'hr@company.com' : ''}
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{t('auth.password')} *</span>
              <div className={inputWrapCls}>
                <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                <input required type="password" minLength={6} value={form.password} onChange={set('password')} className={inputCls} />
              </div>
            </label>

            {/* เลือก role (เฉพาะโหมดสมัคร): การ์ด HR / Executive */}
            {mode === 'register' && (
              <div className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">{t('auth.role')} *</span>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: value }))}
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        form.role === value
                          ? 'border-azure-600 bg-azure-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon
                        className={`mb-1.5 h-5 w-5 ${
                          form.role === value ? 'text-azure-600' : 'text-slate-400'
                        }`}
                      />
                      <div
                        className={`text-sm font-semibold ${
                          form.role === value ? 'text-azure-700' : 'text-slate-600'
                        }`}
                      >
                        {t(`auth.roles.${value}`)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ปุ่ม submit + ลิงก์สลับโหมด login/register */}
            {error && (
              <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-azure-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-azure-600/30 transition duration-150 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-lg active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:active:scale-100"
            >
              {busy && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {busy ? t('common.saving') : mode === 'login' ? t('auth.login') : t('auth.register')}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <button type="button" onClick={switchMode} className="font-semibold text-azure-600 hover:underline">
              {mode === 'login' ? t('auth.register') : t('auth.login')}
            </button>
          </p>

          {/* บัญชี demo สำหรับทดลอง (โหมด login) */}
          {mode === 'login' && (
            <div className="mt-5 rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
              <div className="mb-1 font-semibold text-slate-600">{t('auth.demoAccounts')}</div>
              <div>HR — hr@company.com / hr12345</div>
              <div>Executive — exec@company.com / exec12345</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
