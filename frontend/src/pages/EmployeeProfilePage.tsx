// ==============================
// หน้าโปรไฟล์พนักงาน — ข้อมูลส่วนตัว, สถิติสำคัญ และแท็บประวัติ (การลา/เวลาทำงาน/payroll/ประเมิน)
// ==============================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, KeyRound, Printer } from 'lucide-react';
import { api } from '../api/client';
import {
  accountFormSchema,
  firstIssueMessage,
} from '../api/schemas';
import type { AttendanceRecord, Employee, LeaveRequest, PayrollRecord, Review } from '../api/schemas';
import { formatDate, formatMoney } from '../lib/format';
import { btnPrimary, btnSecondary } from '../lib/ui';
import { SkeletonCards, SkeletonTable } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import PayslipDialog from '../components/PayslipDialog';
import EmployeeDialog from '../components/EmployeeDialog';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

/** Dialog สร้างบัญชี login ให้พนักงาน (username/password) — ใช้โดย HR */
function AccountDialog({ employeeId, onClose, onCreated }: { employeeId: number; onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  // ส่วน state ของฟอร์มบัญชี
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ส่วน submit: validate ด้วย zod แล้วสร้างบัญชีผ่าน API
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = accountFormSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createEmployeeAccount(employeeId, parsed.data);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">{t('profile.createLoginTitle')}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-500">{t('profile.createLoginDesc')}</Dialog.Description>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('auth.username')} *</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} required minLength={3} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('auth.password')} *</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} required minLength={6} />
            </label>
            {error && <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * หน้าโปรไฟล์พนักงาน
 * @param employeeId id ของพนักงานที่จะแสดง (null = รอการเลือก เช่น พนักงานที่ยังไม่ผูกบัญชี)
 */
export default function EmployeeProfilePage({ employeeId }: { employeeId: number | null }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { goTab } = useNav();
  const isHR = user?.role === 'hr' || user?.role === 'executive';
  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  // ส่วน state: ข้อมูลพนักงาน + ประวัติทั้ง 4 ประเภท + สถานะ dialog/สลิป
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [payslip, setPayslip] = useState<PayrollRecord | null>(null);

  // ส่วนดึงข้อมูล: โหลดข้อมูลพนักงาน + การลา/เวลาทำงาน/ประเมิน พร้อมกัน
  // และวนดึง payroll ย้อนหลัง 6 เดือนล่าสุด (แต่ละเดือนเป็นคำขอแยกกัน)
  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const emp = await api.getEmployee(employeeId);
      setEmployee(emp);
      const [lv, att, rv] = await Promise.all([
        api.getLeaves(employeeId).catch(() => []),
        api.getAttendance(employeeId).catch(() => []),
        api.getReviews(employeeId).catch(() => []),
      ]);
      setLeaves(lv);
      setAttendance(att);
      setReviews(rv);
      // วนย้อนหลัง 6 เดือน (เดือนปัจจุบันถึง 5 เดือนก่อน) เก็บทุกแถว payroll ที่เจอ
      const now = new Date();
      const months: PayrollRecord[] = [];
      for (let i = 0; i < 6; i += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const rows = await api.getPayroll(d.getFullYear(), d.getMonth() + 1, employeeId).catch(() => []);
        months.push(...rows);
      }
      setPayroll(months);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={1} />
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }
  if (error || !employee) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-600">{t('common.error')}: {error}</p>
        {isHR && (
          <button type="button" onClick={() => goTab('employees')} className="mt-3 text-sm font-medium text-azure-600 hover:underline">
            {t('profile.backToList')}
          </button>
        )}
      </div>
    );
  }

  // วันลาคงเหลือ = โควตา - ที่ใช้ไป
  const remaining = Number(employee.annual_leave_quota) - Number(employee.used_leave_days);

  return (
    <section>
      {/* ปุ่มกลับไปรายชื่อพนักงาน (เฉพาะ HR) */}
      {isHR && (
        <button
          type="button"
          onClick={() => goTab('employees')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-azure-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('profile.backToList')}
        </button>
      )}

      {/* การ์ดหัวโปรไฟล์: avatar, ชื่อ, ตำแหน่ง, ติดต่อ + ปุ่มสร้างบัญชี/แก้ไข (HR) */}
      <div className="card-lift rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar id={employee.employee_id} name={`${employee.first_name} ${employee.last_name}`} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  {employee.first_name} {employee.last_name}
                </h2>
                <Badge status={employee.status} />
              </div>
              <div className="mt-0.5 text-sm text-slate-500">
                {employee.position} · {employee.department_name} · #{employee.employee_id}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {employee.email}{employee.phone ? ` · ${employee.phone}` : ''}
              </div>
            </div>
          </div>
          {isHR && (
            <div className="flex gap-2 print:hidden">
              <button type="button" onClick={() => setAccountOpen(true)} className={btnSecondary}>
                <KeyRound className="h-4 w-4" />
                {t('profile.createLogin')}
              </button>
              <button type="button" onClick={() => setEditOpen(true)} className={btnPrimary}>
                {t('employees.edit')}
              </button>
            </div>
          )}
        </div>

        {/* สถิติสำคัญ 4 ช่อง: วันเริ่มงาน, เงินเดือน, เงินเดือนรายปี (x12), โควตาการลา */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">{t('profile.hireDate')}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatDate(employee.hire_date, locale)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">{t('employees.table.salary')}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatMoney(employee.salary, locale)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">{t('profile.annualSalary')}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatMoney(employee.salary * 12, locale)}</div>
          </div>
          <div className="rounded-xl bg-azure-50 p-4">
            <div className="text-xs font-medium text-azure-700">{t('profile.leaveBalance')}</div>
            <div className="mt-1 text-sm font-semibold text-azure-800">
              {t('profile.quota')} {employee.annual_leave_quota} · {t('profile.used')} {Number(employee.used_leave_days)} · {t('profile.remaining')} {remaining}
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนแท็บประวัติ: การลา / เวลาทำงาน / payroll / ประเมินผล */}
      <Tabs.Root defaultValue="leaves" className="mt-6">
        <Tabs.List className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { value: 'leaves', label: `${t('profile.tabLeaves')} (${leaves.length})` },
            { value: 'attendance', label: `${t('profile.tabAttendance')} (${attendance.length})` },
            { value: 'payroll', label: `${t('profile.tabPayroll')} (${payroll.length})` },
            { value: 'reviews', label: `${t('profile.tabReviews')} (${reviews.length})` },
          ].map((tabItem) => (
            <Tabs.Trigger
              key={tabItem.value}
              value={tabItem.value}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-azure-700 data-[state=active]:shadow-sm"
            >
              {tabItem.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* แท็บที่ 1: ประวัติการลา */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <Tabs.Content value="leaves">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('leaves.leaveType')}</th>
                  <th className="px-4 py-3">{t('leaves.startDate')}</th>
                  <th className="px-4 py-3">{t('leaves.endDate')}</th>
                  <th className="px-4 py-3">{t('leaves.days')}</th>
                  <th className="px-4 py-3">{t('leaves.reason')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l.leave_id}>
                    <td className="px-4 py-3">{t(`leaves.types.${l.leave_type}`)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(l.start_date, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(l.end_date, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">{l.total_days}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-slate-600">{l.reason ?? '-'}</td>
                    <td className="px-4 py-3"><Badge status={l.status} /></td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </Tabs.Content>

          {/* แท็บที่ 2: ประวัติเวลาทำงาน */}
          <Tabs.Content value="attendance">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('attendance.date')}</th>
                  <th className="px-4 py-3">{t('attendance.checkIn')}</th>
                  <th className="px-4 py-3">{t('attendance.checkOut')}</th>
                  <th className="px-4 py-3">{t('attendance.hours')}</th>
                  <th className="px-4 py-3">{t('attendance.otHours')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((a) => (
                  <tr key={a.attendance_id}>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.work_date, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">{a.check_in ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.check_out ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.worked_hours == null ? '-' : Number(a.worked_hours).toFixed(1)}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(a.ot_hours).toFixed(1)}</td>
                  </tr>
                ))}
                {attendance.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </Tabs.Content>

          {/* แท็บที่ 3: payroll 6 เดือนล่าสุด + ปุ่มดูสลิป */}
          <Tabs.Content value="payroll">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('payroll.month')}</th>
                  <th className="px-4 py-3">{t('payroll.baseSalary')}</th>
                  <th className="px-4 py-3">{t('payroll.otPay')}</th>
                  <th className="px-4 py-3">{t('payroll.bonus')}</th>
                  <th className="px-4 py-3">{t('payroll.sso')}</th>
                  <th className="px-4 py-3">{t('payroll.tax')}</th>
                  <th className="px-4 py-3">{t('payroll.netPay')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payroll.map((p) => (
                  <tr key={p.payroll_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.pay_period_year}-{String(p.pay_period_month).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatMoney(p.base_salary, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatMoney(p.ot_pay, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatMoney(p.bonus, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">-{formatMoney(p.sso, locale)}</td>
                    <td className="px-4 py-3 text-slate-600">-{formatMoney(p.tax, locale)}</td>
                    <td className="px-4 py-3 font-semibold text-azure-700">{formatMoney(p.net_pay, locale)}</td>
                    <td className="px-4 py-3 print:hidden">
                      <button
                        type="button"
                        onClick={() => setPayslip(p)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        {t('profile.viewPayslip')}
                      </button>
                    </td>
                  </tr>
                ))}
                {payroll.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </Tabs.Content>

          {/* แท็บที่ 4: ผลการประเมิน */}
          <Tabs.Content value="reviews">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('reviews.year')}</th>
                  <th className="px-4 py-3">{t('reviews.reviewer')}</th>
                  <th className="px-4 py-3">{t('reviews.overall')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3">{t('reviews.strengths')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((r) => (
                  <tr key={r.review_id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.period_year}</td>
                    <td className="px-4 py-3 text-slate-600">{r.reviewer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.overall_score == null ? '-' : Number(r.overall_score).toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                        r.status === 'final'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                      }`}>
                        {t(`reviews.status.${r.status}`)}
                      </span>
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600">{r.strengths ?? '-'}</td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* dialogs: แก้ไขข้อมูล, สร้างบัญชี, ดูสลิป */}
      {editOpen && (
        <EmployeeDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={load}
          employee={employee}
        />
      )}
      {accountOpen && (
        <AccountDialog employeeId={employee.employee_id} onClose={() => setAccountOpen(false)} onCreated={load} />
      )}
      <PayslipDialog record={payslip} employee={employee} onClose={() => setPayslip(null)} />
    </section>
  );
}
