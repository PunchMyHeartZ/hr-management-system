import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { api } from '../api/client';
import type { Employee, Review, ReviewGoalPayload } from '../api/schemas';
import { btnPrimary } from '../lib/ui';
import { SkeletonTable, Spinner } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import { useNav } from '../context/NavContext';

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

interface GoalDraft {
  title: string;
  weight: string;
  score: string;
}

interface ReviewDialogProps {
  review: Review | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

function ReviewDialog({ review, employees, onClose, onSaved }: ReviewDialogProps) {
  const { t } = useTranslation();
  const yearNow = new Date().getFullYear();
  const [employeeId, setEmployeeId] = useState(review ? String(review.employee_id) : '');
  const [periodYear, setPeriodYear] = useState(String(review?.period_year ?? yearNow));
  const [reviewer, setReviewer] = useState(review?.reviewer_name ?? '');
  const [overall, setOverall] = useState(review?.overall_score == null ? '' : String(Number(review.overall_score)));
  const [strengths, setStrengths] = useState(review?.strengths ?? '');
  const [improvements, setImprovements] = useState(review?.improvements ?? '');
  const [status, setStatus] = useState<'draft' | 'final'>((review?.status as 'draft' | 'final') ?? 'draft');
  const [goals, setGoals] = useState<GoalDraft[]>(
    review?.goals?.length
      ? review.goals.map((g) => ({ title: g.title, weight: String(g.weight), score: g.score == null ? '' : String(Number(g.score)) }))
      : [{ title: '', weight: '1', score: '' }]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setGoal = (i: number, patch: Partial<GoalDraft>) =>
    setGoals((gs) => gs.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError(t('employees.selectDepartment'));
      return;
    }
    const goalPayload: ReviewGoalPayload[] = goals
      .filter((g) => g.title.trim())
      .map((g) => ({
        title: g.title.trim(),
        weight: Number(g.weight) || 1,
        score: g.score === '' ? null : Number(g.score),
      }));
    const shared = {
      period_year: Number(periodYear),
      reviewer_name: reviewer.trim(),
      overall_score: overall === '' ? null : Number(overall),
      strengths: strengths.trim() || null,
      improvements: improvements.trim() || null,
      status,
      goals: goalPayload,
    };
    setSaving(true);
    setError(null);
    try {
      if (review) {
        await api.updateReview(review.review_id, shared);
      } else {
        await api.createReview({ ...shared, employee_id: Number(employeeId) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(94vw,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {review ? t('reviews.edit') : t('reviews.add')}
          </Dialog.Title>

          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('leaves.employee')} *</span>
                {review ? (
                  <input value={review.employee_name} disabled className={`${inputCls} bg-slate-50`} />
                ) : (
                  <Select.Root value={employeeId} onValueChange={setEmployeeId}>
                    <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('leaves.employee')}>
                      <Select.Value placeholder={t('leaves.selectEmployee')} />
                      <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content position="popper" sideOffset={4} className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <Select.Viewport>
                          {employees.map((emp) => (
                            <Select.Item key={emp.employee_id} value={String(emp.employee_id)} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700">
                              <Select.ItemText>{emp.first_name} {emp.last_name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                )}
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('reviews.year')} *</span>
                <input type="number" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} min="2000" max="2100" className={inputCls} required />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('common.status')}</span>
                <Select.Root value={status} onValueChange={(v) => setStatus(v as 'draft' | 'final')}>
                  <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('common.status')}>
                    <Select.Value />
                    <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content position="popper" sideOffset={4} className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      <Select.Viewport>
                        {(['draft', 'final'] as const).map((s) => (
                          <Select.Item key={s} value={s} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700">
                            <Select.ItemText>{t(`reviews.status.${s}`)}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('reviews.reviewer')} *</span>
                <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} className={inputCls} required maxLength={150} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">{t('reviews.overall')} (1-5)</span>
                <input type="number" min="1" max="5" step="0.5" value={overall} onChange={(e) => setOverall(e.target.value)} className={inputCls} />
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('reviews.strengths')}</span>
              <textarea rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('reviews.improvements')}</span>
              <textarea rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} className={inputCls} />
            </label>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{t('reviews.goals')}</span>
                <button
                  type="button"
                  onClick={() => setGoals((gs) => [...gs, { title: '', weight: '1', score: '' }])}
                  className="inline-flex items-center gap-1 rounded-md bg-azure-50 px-2.5 py-1 text-xs font-semibold text-azure-700 hover:bg-azure-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('reviews.addGoal')}
                </button>
              </div>
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={g.title}
                      onChange={(e) => setGoal(i, { title: e.target.value })}
                      placeholder={t('reviews.goalTitle')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-azure-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={g.weight}
                      onChange={(e) => setGoal(i, { weight: e.target.value })}
                      title={t('reviews.weight')}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-azure-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={g.score}
                      onChange={(e) => setGoal(i, { score: e.target.value })}
                      title={t('reviews.score')}
                      placeholder="-"
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-azure-500 focus:outline-none"
                    />
                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGoals((gs) => gs.filter((_, idx) => idx !== i))}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label="remove goal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving && <Spinner />}
                {saving ? t('common.saving') : t('reviews.save')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ReviewsPage() {
  const { t } = useTranslation();
  const { openProfile } = useNav();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogReview, setDialogReview] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rv, emps] = await Promise.all([api.getReviews(), api.getEmployees()]);
      setReviews(rv);
      setEmployees(emps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = async (review: Review) => {
    try {
      const full = await api.getReview(review.review_id);
      setDialogReview(full);
    } catch {
      setDialogReview(review);
    }
    setDialogOpen(true);
  };

  const remove = async (review: Review) => {
    if (!window.confirm(t('reviews.deleteConfirm'))) return;
    try {
      await api.deleteReview(review.review_id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('reviews.title')}</h2>
          <p className="text-sm text-slate-500">{t('reviews.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDialogReview(null);
            setDialogOpen(true);
          }}
          className={btnPrimary}
        >
          + {t('reviews.add')}
        </button>
      </div>

      {loading && <SkeletonTable rows={4} cols={6} />}
      {error && <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('common.error')}: {error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[t('employees.table.name'), t('employees.table.department'), t('reviews.year'), t('reviews.reviewer'), t('reviews.overall'), t('reviews.goals'), t('common.status'), t('common.actions')].map((label, i) => (
                  <th key={i} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reviews.map((r) => (
                <tr key={r.review_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openProfile(r.employee_id)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <Avatar id={r.employee_id} name={r.employee_name} size="sm" />
                      <span className="font-medium text-slate-900 hover:text-azure-700">{r.employee_name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.department_name}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.period_year}</td>
                  <td className="px-4 py-3 text-slate-600">{r.reviewer_name}</td>
                  <td className="px-4 py-3">
                    {r.overall_score == null ? (
                      <span className="text-slate-400">-</span>
                    ) : (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        Number(r.overall_score) >= 4
                          ? 'bg-emerald-50 text-emerald-700'
                          : Number(r.overall_score) >= 3
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}>
                        {Number(r.overall_score).toFixed(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.goals?.length ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      r.status === 'final'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                    }`}>
                      {t(`reviews.status.${r.status}`)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t('employees.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <ReviewDialog
          review={dialogReview}
          employees={employees}
          onClose={() => setDialogOpen(false)}
          onSaved={load}
        />
      )}
    </section>
  );
}
