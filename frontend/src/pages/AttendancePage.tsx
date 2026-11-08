// ==============================
// หน้าบันทึกเวลาทำงาน — ปุ่ม check-in/check-out และตารางประวัติเวลาเข้า-ออก + ชั่วโมง OT
// ==============================
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Select from '@radix-ui/react-select';
import { api } from '../api/client';
import type { AttendanceRecord, Employee } from '../api/schemas';
import { formatDate } from '../lib/format';
import { SkeletonTable, Spinner } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import { Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const selectTriggerCls =
  'flex w-64 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

type PunchAction = 'in' | 'out';

/** หน้า attendance — HR/Executive สามารถเลือกพนักงานแล้วกดสถิติเวลาเข้า/ออกให้ได้ */
export default function AttendancePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = ['hr', 'executive'].includes(user?.role ?? '');
  // ส่วน state: ประวัติเวลาทำงาน, พนักงาน, รหัสที่เลือก, สถานะโหลด, ข้อความผลลัพธ์
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [punching, setPunching] = useState<PunchAction | null>(null);

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  // ส่วนดึงข้อมูล: โหลดประวัติเวลาทำงาน + รายชื่อพนักงาน
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recs, emps] = await Promise.all([api.getAttendance(), api.getEmployees()]);
      setRecords(recs);
      setEmployees(emps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ตั้งค่าเริ่มต้น: เลือกพนักงานคนแรกอัตโนมัติเมื่อโหลดรายชื่อเสร็จ
  useEffect(() => {
    if (!employeeId && employees.length) {
      setEmployeeId(String(employees[0].employee_id));
    }
  }, [employees, employeeId]);

  // ส่วน event handler: บันทึกเวลาเข้า ('in') หรือออก ('out') ของพนักงานที่เลือก
  const punch = async (action: PunchAction) => {
    if (!employeeId || punching) return;
    setPunching(action);
    setMessage(null);
    setError(null);
    try {
      if (action === 'in') {
        await api.clockIn(Number(employeeId));
        setMessage(t('attendance.clockedIn'));
      } else {
        await api.clockOut(Number(employeeId));
        setMessage(t('attendance.clockedOut'));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record attendance');
      setLoading(false);
    } finally {
      setPunching(null);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">{t('attendance.title')}</h2>
        <p className="text-sm text-slate-500">{t('attendance.subtitle')}</p>
      </div>

      {/* ส่วนควบคุม: เลือกพนักงาน + ปุ่ม check-in/check-out + ข้อความผลลัพธ์ */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {canEdit && (
          <>
            <Select.Root value={employeeId} onValueChange={setEmployeeId}>
              <Select.Trigger className={selectTriggerCls} aria-label={t('leaves.employee')}>
                <Select.Value placeholder={t('leaves.selectEmployee')} />
                <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                >
                  <Select.Viewport>
                    {employees.map((e) => (
                      <Select.Item
                        key={e.employee_id}
                        value={String(e.employee_id)}
                        className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700"
                      >
                        <Select.ItemText>
                          {e.first_name} {e.last_name}
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            <button
              type="button"
              onClick={() => punch('in')}
              disabled={!!punching}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {punching === 'in' && <Spinner />}
              {t('attendance.clockIn')}
            </button>
            <button
              type="button"
              onClick={() => punch('out')}
              disabled={!!punching}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-500/25 transition duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {punching === 'out' && <Spinner />}
              {t('attendance.clockOut')}
            </button>
          </>
        )}

        {message && (
          <span className="banner-in rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            {message}
          </span>
        )}
        {error && (
          <span className="banner-in rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">{error}</span>
        )}
      </div>

      {loading && <SkeletonTable rows={6} cols={6} />}

      {/* ส่วนแสดงตารางประวัติเวลาทำงาน */}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t('attendance.date'),
                  t('leaves.employee'),
                  t('attendance.checkIn'),
                  t('attendance.status'),
                  t('attendance.checkOut'),
                  t('attendance.hours'),
                  t('attendance.otHours'),
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
              {records.map((r) => (
                <tr key={r.attendance_id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(r.work_date, locale)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar id={r.employee_id} name={r.employee_name} size="sm" />
                      <span className="font-medium text-slate-900">{r.employee_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.check_in ?? '-'}</td>
                  {/* สถานะการเข้างาน: เข้าก่อน/ตรง 08:00 = ปกติ (เขียว), หลัง 08:00 = เข้าสาย (แดง) */}
                  <td className="px-4 py-3">
                    {r.is_late ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        {t('attendance.late')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {t('attendance.onTime')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.check_out}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.worked_hours == null ? '-' : `${Number(r.worked_hours).toFixed(1)}`}
                  </td>
                  {/* แสดงชั่วโมง OT เป็นป้ายสีเหลืองเฉพาะเมื่อมีค่ามากกว่า 0 */}
                  <td className="px-4 py-3">
                    {Number(r.ot_hours) > 0 ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {Number(r.ot_hours).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Inbox className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                    <span className="text-sm text-slate-400">{t('common.noData')}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
