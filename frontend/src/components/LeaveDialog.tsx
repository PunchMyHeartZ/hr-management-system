import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { api } from '../api/client';
import { leaveFormSchema, firstIssueMessage } from '../api/schemas';
import type { Employee, LeavePayload, LeaveType } from '../api/schemas';
import { btnPrimary } from '../lib/ui';
import { Spinner } from './Skeleton';

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'personal', 'unpaid'];

interface LeaveForm {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}

const EMPTY: LeaveForm = {
  employee_id: '',
  leave_type: '',
  start_date: '',
  end_date: '',
  reason: '',
};

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  employees?: Employee[];
  fixedEmployeeId?: number;
}

export default function LeaveDialog({ open, onOpenChange, onCreated, employees = [], fixedEmployeeId }: LeaveDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LeaveForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof LeaveForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const employeeId = fixedEmployeeId != null ? String(fixedEmployeeId) : form.employee_id;
    const parsed = leaveFormSchema.safeParse({ ...form, employee_id: employeeId });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    const body: LeavePayload = {
      employee_id: Number(parsed.data.employee_id),
      leave_type: parsed.data.leave_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      reason: parsed.data.reason || null,
    };
    try {
      await api.createLeave(body);
      setForm(EMPTY);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leave request');
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
            {t('leaves.newRequest')}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-slate-500">
            {t('leaves.subtitle')}
          </Dialog.Description>

          <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fixedEmployeeId != null ? (
              <div className="sr-only" aria-hidden="true" />
            ) : (
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('leaves.employee')} *</span>
                <Select.Root
                  value={form.employee_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, employee_id: v }))}
                >
                  <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('leaves.employee')}>
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
              </label>
            )}
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('leaves.leaveType')} *</span>
              <Select.Root
                value={form.leave_type}
                onValueChange={(v) => setForm((f) => ({ ...f, leave_type: v }))}
              >
                <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('leaves.leaveType')}>
                  <Select.Value placeholder={t('leaves.selectType')} />
                  <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={4}
                    className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                  >
                    <Select.Viewport>
                      {LEAVE_TYPES.map((type) => (
                        <Select.Item
                          key={type}
                          value={type}
                          className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700"
                        >
                          <Select.ItemText>{t(`leaves.types.${type}`)}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('leaves.startDate')} *</span>
              <input required type="date" value={form.start_date} onChange={set('start_date')} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('leaves.endDate')} *</span>
              <input
                required
                type="date"
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={set('end_date')}
                className={inputCls}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">{t('leaves.reason')}</span>
              <textarea
                rows={2}
                value={form.reason}
                onChange={set('reason')}
                placeholder={t('leaves.reasonPlaceholder')}
                className={inputCls}
              />
            </label>

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
