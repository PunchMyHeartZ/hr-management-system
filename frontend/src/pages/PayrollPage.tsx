// ==============================
// หน้าจ่ายเงินเดือน (payroll) — เลือกเดือน, สร้างรายการจ่าย, แก้โบนัสย่อหน้า, export CSV และดูสลิป
// ==============================
import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { PayrollRecord } from '../api/schemas';
import { formatMoney } from '../lib/format';
import { btnPrimary, btnSecondary } from '../lib/ui';
import { SkeletonTable, Spinner } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import PayslipDialog from '../components/PayslipDialog';
import { Inbox, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** เซลล์แก้ไขโบนัสในตาราง — กรอกจำนวนแล้วกด save (หรือ Enter) เพื่อบันทึกโบนัสรายปีของพนักงาน */
function BonusCell({
  record,
  year,
  onSaved,
}: {
  record: PayrollRecord;
  year: number;
  onSaved: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  // ส่วน state: ค่าโบนัสใน input, สถานะบันทึก, error
  const [value, setValue] = useState(String(Number(record.bonus)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ซิงก์ input ให้ตรงข้อมูลใหม่เมื่อตารางโหลดใหม่
  useEffect(() => {
    setValue(String(Number(record.bonus)));
  }, [record.bonus]);

  // บันทึกโบนัส (ถ้ากรอกค่าไม่ใช่ตัวเลขให้ถือเป็น 0)
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveBonus(record.employee_id, year, Number(value) || 0);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save bonus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') save();
          }}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-azure-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200 active:scale-[0.97] disabled:opacity-60"
        >
          {saving && <Spinner className="h-3 w-3" />}
          {saving ? '' : t('common.save')}
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

/** หน้า payroll — แสดงตารางเงินเดือนรายเดือน พร้อมแถวรวม (tfoot) และปุ่มสั่งพิมพ์สลิป */
export default function PayrollPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = ['hr', 'executive'].includes(user?.role ?? '');
  const now = new Date();
  // ส่วน state: เดือนที่เลือก (YYYY-MM เริ่มที่เดือนปัจจุบัน), แถวข้อมูล, สถานะต่าง ๆ, สลิปที่เปิดดู
  const [monthValue, setMonthValue] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [rows, setRows] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payslip, setPayslip] = useState<PayrollRecord | null>(null);

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
  // แยกค่า month input "YYYY-MM" เป็นตัวเลขปี/เดือน
  const [yearStr, monthStr] = monthValue.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  // ส่วนดึงข้อมูล: โหลด payroll ตามปี/เดือนที่เลือก
  const load = useCallback(async () => {
    if (!year || !month) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await api.getPayroll(year, month));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  // สั่งระบบคำนวณ/สร้างรายการ payroll ของเดือนที่เลือกใหม่ทั้งหมด
  const generate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.generatePayroll(year, month);
      setMessage(t('payroll.generated'));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate payroll');
      setLoading(false);
    }
  };

  // ส่วน export CSV: ห่อค่าด้วย double quote (escape ตัว " เป็น "") ป้องกันปัญหา comma ในข้อมูล
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Employee', 'Base Salary', 'OT Hours', 'OT Pay', 'Bonus', 'SSO', 'Tax', 'Net Pay'];
    const lines = rows.map((r) =>
      [r.employee_name, r.base_salary, r.ot_hours, r.ot_pay, r.bonus, r.sso, r.tax, r.net_pay]
        .map(esc)
        .join(',')
    );
    // นำหน้าด้วย BOM (\uFEFF) เพื่อให้ Excel เปิดไฟล์ UTF-8 แล้วอ่านภาษาไทยได้ถูกต้อง
    const csv = '\uFEFF' + [header.map(esc).join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    // สร้างลิงก์ดาวน์โหลดชั่วคราวแล้วคลิกอัตโนมัติ
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${monthValue}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // รวมยอดทุกคอลัมน์สำหรับแถว total (tfoot)
  const totals = rows.reduce(
    (acc, r) => ({
      base: acc.base + Number(r.base_salary),
      otPay: acc.otPay + Number(r.ot_pay),
      bonus: acc.bonus + Number(r.bonus),
      sso: acc.sso + Number(r.sso),
      tax: acc.tax + Number(r.tax),
      net: acc.net + Number(r.net_pay),
    }),
    { base: 0, otPay: 0, bonus: 0, sso: 0, tax: 0, net: 0 }
  );

  return (
    <section>
      {/* ส่วนหัวหน้า: เลือกเดือน + ปุ่มสร้าง payroll/export CSV (เฉพาะผู้มีสิทธิ์) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('payroll.title')}</h2>
          <p className="text-sm text-slate-500">{t('payroll.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">{t('payroll.month')}</span>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none"
            />
          </label>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className={btnPrimary}
            >
              {loading && <Spinner />}
              {t('payroll.generate')}
            </button>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className={btnSecondary}
              >
                {t('payroll.exportCsv')}
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      <p className="mb-4 text-xs text-slate-400">{t('payroll.note')}</p>

      {message && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {message}
        </p>
      )}
      {error && !loading && (
        <p className="banner-in mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('common.error')}: {error}
        </p>
      )}

      {loading && rows.length === 0 && <SkeletonTable rows={4} cols={8} />}

      {/* ส่วนแสดงตาราง payroll (หรี่ลงระหว่างโหลด) */}
      {(rows.length > 0 || !loading) && (
        <div
          className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm transition ${
            loading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t('leaves.employee'),
                  t('payroll.baseSalary'),
                  t('attendance.otHours'),
                  t('payroll.otPay'),
                  t('payroll.bonus'),
                  t('payroll.sso'),
                  t('payroll.tax'),
                  t('payroll.netPay'),
                  '',
                ].map((label, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.payroll_id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar id={r.employee_id} name={r.employee_name} size="sm" />
                      <span className="font-medium text-slate-900">{r.employee_name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatMoney(r.base_salary, locale)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{Number(r.ot_hours).toFixed(1)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-amber-700">
                    {formatMoney(r.ot_pay, locale)}
                  </td>
                  {/* คอลัมน์โบนัส: HR แก้ได้ผ่าน BonusCell, พนักงานเห็นเป็นตัวเลขอย่างเดียว */}
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <BonusCell record={r} year={year} onSaved={generate} />
                    ) : (
                      <span className="text-slate-600">{formatMoney(r.bonus, locale)}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    -{formatMoney(r.sso, locale)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    -{formatMoney(r.tax, locale)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-azure-700">
                    {formatMoney(r.net_pay, locale)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 print:hidden">
                    <button
                      type="button"
                      onClick={() => setPayslip(r)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {t('profile.viewPayslip')}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Inbox className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                    <span className="text-sm text-slate-400">{t('common.noData')}</span>
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td className="px-4 py-3">{t('payroll.total')}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatMoney(totals.base, locale)}</td>
                  <td />
                  <td className="whitespace-nowrap px-4 py-3">{formatMoney(totals.otPay, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatMoney(totals.bonus, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-3">-{formatMoney(totals.sso, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-3">-{formatMoney(totals.tax, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-azure-700">
                    {formatMoney(totals.net, locale)}
                  </td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <PayslipDialog record={payslip} onClose={() => setPayslip(null)} />
    </section>
  );
}
