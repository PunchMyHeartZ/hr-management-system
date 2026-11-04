import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { api } from '../api/client';
import { employeeFormSchema, firstIssueMessage } from '../api/schemas';
import type { Department, Employee, EmployeePayload, EmployeeStatus } from '../api/schemas';
import { btnPrimary } from '../lib/ui';
import { Spinner } from './Skeleton';

interface EmployeeForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department_id: string;
  hire_date: string;
  salary: string;
  annual_leave_quota: string;
  status: EmployeeStatus;
}

const EMPTY: EmployeeForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: '',
  department_id: '',
  hire_date: '',
  salary: '',
  annual_leave_quota: '10',
  status: 'active',
};

const STATUSES: EmployeeStatus[] = ['active', 'inactive', 'terminated'];

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  employee?: Employee | null;
}

export default function EmployeeDialog({ open, onOpenChange, onSaved, employee = null }: EmployeeDialogProps) {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<EmployeeForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(employee);

  useEffect(() => {
    if (open) {
      api.getDepartments().then(setDepartments).catch(() => setDepartments([]));
      setError(null);
      setForm(
        employee
          ? {
              first_name: employee.first_name ?? '',
              last_name: employee.last_name ?? '',
              email: employee.email ?? '',
              phone: employee.phone ?? '',
              position: employee.position ?? '',
              department_id: String(employee.department_id ?? ''),
              hire_date: employee.hire_date ?? '',
              salary: String(Number(employee.salary ?? 0)),
              annual_leave_quota: String(employee.annual_leave_quota ?? 10),
              status: (employee.status as EmployeeStatus) ?? 'active',
            }
          : EMPTY
      );
    }
  }, [open, employee]);

  const set = (key: keyof EmployeeForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = employeeFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    const body: EmployeePayload = {
      ...parsed.data,
      department_id: Number(parsed.data.department_id),
      phone: parsed.data.phone || null,
      hire_date: parsed.data.hire_date || null,
    };
    try {
      if (editing && employee) {
        await api.updateEmployee(employee.employee_id, body);
      } else {
        await api.createEmployee(body);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="dialog-content fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {editing ? t('employees.editEmployee') : t('employees.newEmployee')}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-500">
            {t('employees.subtitle')}
          </Dialog.Description>

          <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.firstName')} *</span>
              <input required value={form.first_name} onChange={set('first_name')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.lastName')} *</span>
              <input required value={form.last_name} onChange={set('last_name')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.email')} *</span>
              <input required type="email" value={form.email} onChange={set('email')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.phone')}</span>
              <input value={form.phone} onChange={set('phone')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.position')} *</span>
              <input required value={form.position} onChange={set('position')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.department')} *</span>
              <Select.Root
                value={form.department_id}
                onValueChange={(v) => setForm((f) => ({ ...f, department_id: v }))}
              >
                <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('employees.department')}>
                  <Select.Value placeholder={t('employees.selectDepartment')} />
                  <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={4}
                    className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                  >
                    <Select.Viewport>
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
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.hireDate')}</span>
              <input type="date" value={form.hire_date} onChange={set('hire_date')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.salary')} *</span>
              <input required type="number" min="0" step="0.01" value={form.salary} onChange={set('salary')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.leaveQuota')}</span>
              <input type="number" min="0" max="365" value={form.annual_leave_quota} onChange={set('annual_leave_quota')} className={inputCls} />
            </label>
            {editing && (
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('common.status')}</span>
                <Select.Root
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as EmployeeStatus }))}
                >
                  <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('common.status')}>
                    <Select.Value />
                    <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      sideOffset={4}
                      className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      <Select.Viewport>
                        {STATUSES.map((s) => (
                          <Select.Item
                            key={s}
                            value={s}
                            className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700"
                          >
                            <Select.ItemText>{t(`employees.status.${s}`)}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
            )}

            {error && (
              <p className="sm:col-span-2 banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={saving}
                className={btnPrimary}
              >
                {saving && <Spinner />}
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              &#10005;
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
