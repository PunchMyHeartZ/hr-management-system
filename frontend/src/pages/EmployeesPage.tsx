// ==============================
// หน้าจัดการพนักงาน — ตารางรายชื่อ + ฟอร์มเพิ่ม/แก้ไข (EmployeeDialog) พร้อมค้นหาและกรองแผนก
// ==============================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Select from '@radix-ui/react-select';
import { Search, Pencil, Inbox } from 'lucide-react';
import { api } from '../api/client';
import type { Department, Employee } from '../api/schemas';
import { formatDate, formatMoney } from '../lib/format';
import { btnPrimary } from '../lib/ui';
import { SkeletonTable } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import EmployeeDialog from '../components/EmployeeDialog';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

/** หน้ารายชื่อพนักงาน — ค้นหา/กรอง, แสดงตารางข้อมูล, เปิดโปรไฟล์หรือแก้ไข (เฉพาะ HR/Executive) */
export default function EmployeesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { openProfile } = useNav();
  // เฉพาะ HR/Executive แก้ไขข้อมูลพนักงานได้
  const canEdit = ['hr', 'executive'].includes(user?.role ?? '');
  // ส่วน state: ข้อมูลพนักงาน/แผนก, สถานะโหลด, dialog, คำค้นหาและตัวกรองแผนก
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  // ส่วนดึงข้อมูล: โหลดพนักงาน + แผนกพร้อมกัน
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emps, depts] = await Promise.all([api.getEmployees(), api.getDepartments()]);
      setEmployees(emps);
      setDepartments(depts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ส่วนกรองรายชื่อ: ตรงกับคำค้น (ชื่อ/อีเมล/ตำแหน่ง) และแผนกที่เลือก
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const matchQ =
        !q ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q);
      const matchD = !deptFilter || String(e.department_id) === deptFilter;
      return matchQ && matchD;
    });
  }, [employees, search, deptFilter]);

  // เปิด dialog แก้ไข / เพิ่มพนักงาน
  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <section>
      {/* ส่วนหัวหน้า + ปุ่มเพิ่มพนักงาน (เฉพาะผู้มีสิทธิ์) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('employees.title')}</h2>
          <p className="text-sm text-slate-500">{t('employees.subtitle')}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className={btnPrimary}
          >
            + {t('employees.addEmployee')}
          </button>
        )}
      </div>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        employee={editing}
      />

      {/* ส่วนค้นหา + ตัวกรองแผนก + ตัวนับจำนวน */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-azure-500 focus-within:ring-2 focus-within:ring-azure-500/30">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('employees.search')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <Select.Root value={deptFilter} onValueChange={setDeptFilter}>
          <Select.Trigger
            className="flex w-48 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none"
            aria-label={t('employees.department')}
          >
            <Select.Value placeholder={t('employees.allDepartments')} />
            <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={4}
              className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            >
              <Select.Viewport>
                <Select.Item
                  value="all"
                  className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700"
                >
                  <Select.ItemText>{t('employees.allDepartments')}</Select.ItemText>
                </Select.Item>
                {departments.map((d) => (
                  <Select.Item
                    key={d.department_id}
                    value={String(d.department_id)}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700"
                  >
                    <Select.ItemText>{d.department_name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <span className="text-xs text-slate-400">
          {filtered.length}/{employees.length}
        </span>
      </div>

      {loading && <SkeletonTable rows={5} cols={10} />}

      {error && (
        <div className="py-16 text-center">
          <p className="text-sm text-red-600">
            {t('common.error')}: {error}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* ส่วนแสดงตารางรายชื่อ */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            {/* หัวตาราง */}
            <thead className="bg-slate-50">
              <tr>
                {[
                  t('employees.table.name'),
                  t('employees.table.email'),
                  t('employees.table.phone'),
                  t('employees.table.position'),
                  t('employees.table.department'),
                  t('employees.table.hireDate'),
                  t('employees.table.salary'),
                  t('employees.leaveRemaining'),
                  t('employees.table.status'),
                  t('common.actions'),
                ].map((label, i) => (
                  <th
                    key={i}
                    className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      i === 7 ? 'min-w-[8.5rem]' : i === 8 ? 'min-w-[8rem]' : ''
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            {/* แถวข้อมูลพนักงาน */}
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                // วันลาคงเหลือ = โควตาประจำปี - วันที่ใช้ไปแล้ว
                const remaining = Number(e.annual_leave_quota) - Number(e.used_leave_days);
                return (
                  <tr key={e.employee_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openProfile(e.employee_id)}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar id={e.employee_id} name={`${e.first_name} ${e.last_name}`} />
                        <div>
                          <div className="font-medium text-slate-900 hover:text-azure-700">
                            {e.first_name} {e.last_name}
                          </div>
                          <div className="text-xs text-slate-400">#{e.employee_id}</div>
                        </div>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{e.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{e.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.position}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-azure-50 px-2.5 py-0.5 text-xs font-medium text-azure-700">
                        {e.department_name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(e.hire_date, locale)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {formatMoney(e.salary, locale)}
                    </td>
                    {/* ป้ายวันลาคงเหลือ — สีตามจำนวน: เขียว >3, เหลือง 1-3, แดงหมด */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        title={`${t('employees.leaveQuota')}: ${e.annual_leave_quota} | ${t('leaves.days')}: ${e.used_leave_days}`}
                        className={`inline-flex min-w-[5rem] items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                          remaining > 3
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                            : remaining > 0
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        }`}
                      >
                        {remaining} {t('dashboard.days')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={e.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('employees.edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
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
