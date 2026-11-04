import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { Employee, LeaveRequest, LeaveStatus } from '../api/schemas';
import { formatDate } from '../lib/format';
import LeaveDialog from '../components/LeaveDialog';
import Badge from '../components/Badge';
import { btnPrimary } from '../lib/ui';
import { SkeletonTable, Spinner } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import { Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LeavesPage({ self = false }: { self?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isManager = ['hr', 'executive'].includes(user?.role ?? '');
  const canApprove = !self && isManager;
  const canRequest = self || isManager;
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, e] = await Promise.all([api.getLeaves(), api.getEmployees()]);
      setLeaves(l);
      setEmployees(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: number, status: LeaveStatus) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await api.updateLeaveStatus(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update leave status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('leaves.title')}</h2>
          <p className="text-sm text-slate-500">{t('leaves.subtitle')}</p>
        </div>
        {canRequest && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={btnPrimary}
          >
            + {t('leaves.requestLeave')}
          </button>
        )}
      </div>

      {canRequest && (
        <LeaveDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={load}
          employees={employees}
          fixedEmployeeId={self && user?.employee_id ? user.employee_id : undefined}
        />
      )}

      {loading && <SkeletonTable rows={4} cols={8} />}

      {error && !loading && (
        <div className="banner-in mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('common.error')}: {error}
          <button
            type="button"
            onClick={load}
            className="ml-3 font-semibold underline underline-offset-2"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[t('leaves.employee'), t('leaves.leaveType'), t('leaves.startDate'), t('leaves.endDate'), t('leaves.days'), t('leaves.reason'), t('common.status'), t('common.actions')].map((label, i) => (
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
              {leaves.map((l) => (
                <tr key={l.leave_id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar id={l.employee_id} name={l.employee_name} size="sm" />
                      <span className="font-medium text-slate-900">{l.employee_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-azure-50 px-2.5 py-0.5 text-xs font-medium text-azure-700">
                      {t(`leaves.types.${l.leave_type}`)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(l.start_date, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(l.end_date, locale)}</td>
                  <td className="px-4 py-3 text-slate-600">{l.total_days}</td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600">{l.reason ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Badge status={l.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {l.status === 'pending' && canApprove ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(l.leave_id, 'approved')}
                          disabled={busyId === l.leave_id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.97] disabled:opacity-60"
                        >
                          {busyId === l.leave_id && <Spinner className="h-3 w-3" />}
                          {t('leaves.approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(l.leave_id, 'rejected')}
                          disabled={busyId === l.leave_id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.97] disabled:opacity-60"
                        >
                          {busyId === l.leave_id && <Spinner className="h-3 w-3" />}
                          {t('leaves.reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
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
