import { useTranslation } from 'react-i18next';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutDashboard, Users, CalendarDays, Clock3, Wallet, LogOut, Crown, ShieldCheck, BarChart3 } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../context/AuthContext';

const BASE_NAV = [
  { value: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { value: 'employees', icon: Users, labelKey: 'nav.employees' },
  { value: 'leaves', icon: CalendarDays, labelKey: 'nav.leaves' },
  { value: 'attendance', icon: Clock3, labelKey: 'nav.attendance' },
  { value: 'payroll', icon: Wallet, labelKey: 'nav.payroll' },
];

const EXEC_NAV = { value: 'execinsights', icon: BarChart3, labelKey: 'nav.executive' };

export default function AppLayout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const isHR = user?.role === 'hr';
  const NAV = user?.role === 'executive' ? [...BASE_NAV, EXEC_NAV] : BASE_NAV;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-[#F3F8FE] to-blue-50">
      <aside className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-azure-600 text-sm font-bold text-white">
              HR
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">{t('app.title')}</div>
              <div className="hidden text-xs text-slate-400 sm:block">{t('app.subtitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={logout}
              aria-label={t('auth.logout')}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Tabs.List className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:flex-1 lg:flex-col lg:overflow-visible lg:border-t-0 lg:px-3 lg:py-3">
          {NAV.map(({ value, icon: Icon, labelKey }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-azure-50 hover:text-azure-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-400 data-[state=active]:to-azure-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-azure-600/30"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(labelKey)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="hidden border-t border-slate-100 p-4 lg:block">
          <div className="mb-3 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azure-100 text-sm font-bold text-azure-700">
                {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-slate-900">{user?.full_name}</div>
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isHR ? 'bg-azure-100 text-azure-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isHR ? <ShieldCheck className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                  {t(`auth.roles.${user?.role}`)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      <main className="px-4 py-6 sm:px-6 lg:py-8 lg:pl-72 lg:pr-8">{children}</main>
    </div>
  );
}
