// ==============================
// โครงหน้าจอหลัก (layout) — sidebar นำทาง + พื้นที่เนื้อหา แยกเมนูตาม role (HR/Executive/พนักงาน)
// ==============================
import { useTranslation } from 'react-i18next';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutDashboard, Users, CalendarDays, Clock3, Wallet, LogOut, Crown, ShieldCheck, BarChart3, CalendarRange, Building2, Target, UserPlus, UserCircle, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  value: string;
  icon: LucideIcon;
  labelKey: string;
}

// เมนูของ HR (executive จะได้รายการนี้ + EXEC_NAV เพิ่ม)
const HR_NAV: NavItem[] = [
  { value: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { value: 'employees', icon: Users, labelKey: 'nav.employees' },
  { value: 'leaves', icon: CalendarDays, labelKey: 'nav.leaves' },
  { value: 'calendar', icon: CalendarRange, labelKey: 'nav.calendar' },
  { value: 'attendance', icon: Clock3, labelKey: 'nav.attendance' },
  { value: 'payroll', icon: Wallet, labelKey: 'nav.payroll' },
  { value: 'departments', icon: Building2, labelKey: 'nav.departments' },
  { value: 'reviews', icon: Target, labelKey: 'nav.reviews' },
  { value: 'recruitment', icon: UserPlus, labelKey: 'nav.recruitment' },
];

// เมนูพิเศษสำหรับ executive (Executive Insights)
const EXEC_NAV: NavItem = { value: 'execinsights', icon: BarChart3, labelKey: 'nav.executive' };

// เมนูของพนักงานทั่วไป (โปรไฟล์/การลา/สลิปเงินเดือนของตัวเอง)
const EMPLOYEE_NAV: NavItem[] = [
  { value: 'profile', icon: UserCircle, labelKey: 'nav.myProfile' },
  { value: 'myleaves', icon: CalendarDays, labelKey: 'nav.myLeaves' },
  { value: 'mypayslips', icon: FileText, labelKey: 'nav.myPayslips' },
];

/** Layout หลักของแอป — แสดง sidebar (โลโก้, เมนูตาม role, ข้อมูลผู้ใช้) และ main content */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const isHR = user?.role === 'hr';
  const isEmployee = user?.role === 'employee';
  // เลือกชุดเมนู: พนักงาน > EMPLOYEE_NAV, executive > HR_NAV+EXEC_NAV, ไม่งั้น > HR_NAV
  const NAV = isEmployee
    ? EMPLOYEE_NAV
    : user?.role === 'executive'
      ? [...HR_NAV, EXEC_NAV]
      : HR_NAV;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-[#F3F8FE] to-blue-50">
      {/* ส่วน sidebar: เปลี่ยนเป็นแถบบน (mobile) และคงที่ด้านซ้าย (desktop) */}
      <aside className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col lg:border-b-0 lg:border-r">
        {/* โลโก้ + ปุ่ม utility บน mobile */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 lg:px-4 lg:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-azure-600 text-xs font-bold text-white">
              HR
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">{t('app.title')}</div>
              <div className="hidden text-xs text-slate-400 sm:block">{t('app.subtitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <NotificationBell />
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

        {/* ส่วนเมนูนำทาง (Tabs.List) แนวนอนบน mobile / แนวตั้งบน desktop */}
        <Tabs.List className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 lg:flex-1 lg:flex-col lg:overflow-visible lg:border-t-0 lg:px-2.5 lg:py-2">
          {NAV.map(({ value, icon: Icon, labelKey }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-azure-50 hover:text-azure-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-400 data-[state=active]:to-azure-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-azure-600/30"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(labelKey)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ส่วนการ์ดผู้ใช้ (desktop เท่านั้น): กระดิ่งแจ้งเตือน, สลับภาษา, ชื่อ+role, ปุ่มออกจากระบบ */}
        <div className="hidden border-t border-slate-100 p-3 lg:block">
          <div className="mb-2 flex items-center justify-between gap-2">
            <NotificationBell />
            <LanguageSwitcher />
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-azure-100 text-xs font-bold text-azure-700">
                {user?.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-slate-900">{user?.full_name}</div>
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isEmployee ? 'bg-slate-100 text-slate-600' : isHR ? 'bg-azure-100 text-azure-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isHR ? <ShieldCheck className="h-3 w-3" /> : !isEmployee ? <Crown className="h-3 w-3" /> : null}
                  {t(`auth.roles.${user?.role ?? 'hr'}`)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* พื้นที่เนื้อหาหลัก (เว้นซ้ายให้ sidebar บน desktop) */}
      <main className="px-4 py-6 sm:px-6 lg:py-8 lg:pl-64 lg:pr-8">{children}</main>
    </div>
  );
}
