import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { api } from '../api/client';
import { departmentFormSchema, firstIssueMessage } from '../api/schemas';
import type { Department } from '../api/schemas';
import { btnPrimary } from '../lib/ui';
import { SkeletonTable } from '../components/Skeleton';

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

interface DeptDialogProps {
  department: Department | null;
  onClose: () => void;
  onSaved: () => void;
}

function DeptDialog({ department, onClose, onSaved }: DeptDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(department?.department_name ?? '');
  const [code, setCode] = useState(department?.department_code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = departmentFormSchema.safeParse({ department_name: name, department_code: code });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (department) {
        await api.updateDepartment(department.department_id, parsed.data);
      } else {
        await api.createDepartment(parsed.data);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {department ? t('departments.edit') : t('departments.new')}
          </Dialog.Title>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('departments.name')} *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('departments.code')} *</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} required maxLength={10} />
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

export default function DepartmentsPage() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogDept, setDialogDept] = useState<Department | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depts, employees] = await Promise.all([api.getDepartments(), api.getEmployees()]);
      setDepartments(depts);
      const tally = new Map<number, number>();
      for (const e of employees) tally.set(e.department_id, (tally.get(e.department_id) ?? 0) + 1);
      setCounts(tally);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (dept: Department) => {
    if (!window.confirm(t('departments.deleteConfirm'))) return;
    try {
      await api.deleteDepartment(dept.department_id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('departments.title')}</h2>
          <p className="text-sm text-slate-500">{t('departments.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDialogDept(null);
            setDialogOpen(true);
          }}
          className={btnPrimary}
        >
          + {t('departments.add')}
        </button>
      </div>

      {loading && <SkeletonTable rows={4} cols={4} />}
      {error && (
        <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t('common.error')}: {error}
        </p>
      )}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div key={d.department_id} className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{d.department_name}</div>
                  <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">{d.department_code}</div>
                </div>
                <span className="rounded-lg bg-azure-50 px-3 py-1.5 text-sm font-bold text-azure-700">
                  {counts.get(d.department_id) ?? 0}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDialogDept(d);
                    setDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('employees.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => remove(d)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('departments.delete')}
                </button>
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <Plus className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <span className="text-sm text-slate-400">{t('common.noData')}</span>
            </div>
          )}
        </div>
      )}

      {dialogOpen && (
        <DeptDialog
          department={dialogDept}
          onClose={() => setDialogOpen(false)}
          onSaved={load}
        />
      )}
    </section>
  );
}
