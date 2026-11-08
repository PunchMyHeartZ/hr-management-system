// ==============================
// หน้าการสรรหาบุคลากร — สองแท็บ: ตำแหน่งที่รับสมัคร (การ์ด) และผู้สมัคร (ตาราง + เปลี่ยนสถานะ)
// ==============================
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { api } from '../api/client';
import { applicantFormSchema, firstIssueMessage, positionFormSchema } from '../api/schemas';
import type { Applicant, ApplicantStatus, Department, JobPosition } from '../api/schemas';
import { btnPrimary } from '../lib/ui';
import { SkeletonTable, Spinner } from '../components/Skeleton';
import { formatDate } from '../lib/format';

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

// ลำดับขั้นสถานะผู้สมัคร: สมัคร -> คัดกรอง -> สัมภาษณ์ -> เสนองาน -> รับ/ปฏิเสธ
const APPLICANT_STATUSES: ApplicantStatus[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

// สีป้ายสถานะผู้สมัคร + สถานะตำแหน่ง (open/closed)
const STATUS_STYLES: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-700',
  screening: 'bg-sky-50 text-sky-700',
  interview: 'bg-indigo-50 text-indigo-700',
  offer: 'bg-amber-50 text-amber-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};

/** Dialog เพิ่ม/แก้ไขตำแหน่งงาน — ชื่อ, แผนก, จำนวนที่รับ, รายละเอียด, สถานะเปิด/ปิด */
function PositionDialog({
  position,
  departments,
  onClose,
  onSaved,
}: {
  position: JobPosition | null;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  // ส่วน state ของฟอร์มตำแหน่ง
  const [title, setTitle] = useState(position?.title ?? '');
  const [departmentId, setDepartmentId] = useState(position?.department_id ? String(position.department_id) : '');
  const [description, setDescription] = useState(position?.description ?? '');
  const [headcount, setHeadcount] = useState(String(position?.headcount ?? 1));
  const [status, setStatus] = useState<'open' | 'closed'>((position?.status as 'open' | 'closed') ?? 'open');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ส่วน submit: validate ด้วย zod แล้วสร้าง/อัปเดตตำแหน่ง
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = positionFormSchema.safeParse({
      title,
      department_id: departmentId,
      description,
      headcount,
      status,
    });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      ...parsed.data,
      department_id: Number(parsed.data.department_id),
      description: parsed.data.description || null,
    };
    try {
      if (position) {
        await api.updatePosition(position.position_id, body);
      } else {
        await api.createPosition(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save position');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {position ? t('recruitment.editPosition') : t('recruitment.addPosition')}
          </Dialog.Title>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">{t('recruitment.positionTitle')} *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required maxLength={150} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.department')} *</span>
              <Select.Root value={departmentId} onValueChange={setDepartmentId}>
                <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('employees.department')}>
                  <Select.Value placeholder={t('employees.selectDepartment')} />
                  <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content position="popper" sideOffset={4} className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    <Select.Viewport>
                      {departments.map((d) => (
                        <Select.Item key={d.department_id} value={String(d.department_id)} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700">
                          <Select.ItemText>{d.department_name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('recruitment.headcount')}</span>
              <input type="number" min="1" max="50" value={headcount} onChange={(e) => setHeadcount(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">{t('recruitment.description')}</span>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('common.status')}</span>
              <Select.Root value={status} onValueChange={(v) => setStatus(v as 'open' | 'closed')}>
                <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('common.status')}>
                  <Select.Value />
                  <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content position="popper" sideOffset={4} className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    <Select.Viewport>
                      {(['open', 'closed'] as const).map((s) => (
                        <Select.Item key={s} value={s} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700">
                          <Select.ItemText>{t(`recruitment.${s}`)}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>
            {error && <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-3 pt-1 sm:col-span-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving && <Spinner />}
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Dialog เพิ่มผู้สมัครใหม่ — เลือกตำแหน่งที่สมัคร + ข้อมูลติดต่อ */
function ApplicantDialog({
  positions,
  onClose,
  onSaved,
}: {
  positions: JobPosition[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  // ส่วน state ของฟอร์มผู้สมัคร
  const [positionId, setPositionId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ส่วน submit: validate แล้วบันทึกผู้สมัครใหม่
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = applicantFormSchema.safeParse({ position_id: positionId, full_name: fullName, email, phone, notes });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createApplicant({
        position_id: Number(parsed.data.position_id),
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save applicant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">{t('recruitment.addApplicant')}</Dialog.Title>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">{t('recruitment.appliedFor')} *</span>
              <Select.Root value={positionId} onValueChange={setPositionId}>
                <Select.Trigger className={`${inputCls} flex items-center justify-between`} aria-label={t('recruitment.appliedFor')}>
                  <Select.Value placeholder={t('recruitment.addPosition')} />
                  <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content position="popper" sideOffset={4} className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    <Select.Viewport>
                      {positions.map((p) => (
                        <Select.Item key={p.position_id} value={String(p.position_id)} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700">
                          <Select.ItemText>{p.title}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('recruitment.applicantName')} *</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} required />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.email')} *</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('employees.phone')}</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('recruitment.notes')}</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
            </label>
            {error && <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-3 pt-1 sm:col-span-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving && <Spinner />}
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** หน้า recruitment — โหลดตำแหน่ง/ผู้สมัคร/แผนก แล้วแสดงเป็นสองแท็บ */
export default function RecruitmentPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
  // ส่วน state: ตำแหน่ง, ผู้สมัคร, แผนก, สถานะโหลด, dialogs
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positionDialog, setPositionDialog] = useState<{ open: boolean; position: JobPosition | null }>({ open: false, position: null });
  const [applicantDialog, setApplicantDialog] = useState(false);

  // ส่วนดึงข้อมูล: โหลดตำแหน่ง + ผู้สมัคร + แผนกพร้อมกัน
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, as, ds] = await Promise.all([api.getPositions(), api.getApplicants(), api.getDepartments()]);
      setPositions(ps);
      setApplicants(as);
      setDepartments(ds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recruitment');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ลบตำแหน่ง (มี confirm)
  const removePosition = async (position: JobPosition) => {
    if (!window.confirm(t('recruitment.deleteConfirm'))) return;
    try {
      await api.deletePosition(position.position_id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  // ย้ายผู้สมัครไปขั้นถัดไป (เปลี่ยนสถานะ) แล้วโหลดใหม่
  const moveApplicant = async (applicant: Applicant, status: ApplicantStatus) => {
    try {
      await api.updateApplicantStatus(applicant.applicant_id, status);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  // ส่วนแสดงผล: skeleton ระหว่างโหลด / error
  if (loading) return <SkeletonTable rows={5} cols={6} />;
  if (error) return <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('common.error')}: {error}</p>;

  return (
    <section>
      {/* ส่วนหัวหน้า */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('recruitment.title')}</h2>
          <p className="text-sm text-slate-500">{t('recruitment.subtitle')}</p>
        </div>
      </div>

      {/* แท็บหลัก: ตำแหน่งงาน / ผู้สมัคร */}
      <Tabs.Root defaultValue="positions">
        <Tabs.List className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { value: 'positions', label: `${t('recruitment.tabPositions')} (${positions.length})` },
            { value: 'applicants', label: `${t('recruitment.tabApplicants')} (${applicants.length})` },
          ].map((tb) => (
            <Tabs.Trigger
              key={tb.value}
              value={tb.value}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-azure-700 data-[state=active]:shadow-sm"
            >
              {tb.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* แท็บที่ 1: การ์ดตำแหน่งงานที่เปิดรับ */}
        <Tabs.Content value="positions">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setPositionDialog({ open: true, position: null })}
              className={btnPrimary}
            >
              + {t('recruitment.addPosition')}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {positions.map((p) => (
              <div key={p.position_id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{p.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {p.department_name ?? '-'} · {t('recruitment.headcount')} {p.headcount}
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[p.status] ?? 'bg-slate-100'}`}>
                    {t(`recruitment.${p.status}`)}
                  </span>
                </div>
                {p.description && <p className="mt-3 line-clamp-3 text-sm text-slate-600">{p.description}</p>}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-medium text-azure-700">
                    {p.applicant_count} {t('recruitment.applicants')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPositionDialog({ open: true, position: p })}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('employees.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePosition(p)}
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {positions.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <Plus className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <span className="text-sm text-slate-400">{t('common.noData')}</span>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* แท็บที่ 2: ตารางผู้สมัคร + dropdown ย้ายสถานะ */}
        <Tabs.Content value="applicants">
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setApplicantDialog(true)} className={btnPrimary}>
              + {t('recruitment.addApplicant')}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[t('recruitment.applicantName'), t('recruitment.appliedFor'), t('employees.email'), t('employees.phone'), t('recruitment.appliedDate'), t('common.status'), t('recruitment.moveTo')].map((label, i) => (
                    <th key={i} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((a) => (
                  <tr key={a.applicant_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{a.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.position_title}</td>
                    <td className="px-4 py-3 text-slate-600">{a.email}</td>
                    <td className="px-4 py-3 text-slate-600">{a.phone ?? '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(a.applied_at.slice(0, 10), locale)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[a.status] ?? 'bg-slate-100'}`}>
                        {t(`recruitment.status.${a.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select.Root onValueChange={(v) => moveApplicant(a, v as ApplicantStatus)}>
                        <Select.Trigger className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm focus:border-azure-500 focus:outline-none" aria-label={t('recruitment.moveTo')}>
                          <Select.Value placeholder="→" />
                          <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content position="popper" sideOffset={4} className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                            <Select.Viewport>
                              {APPLICANT_STATUSES.map((s) => (
                                <Select.Item key={s} value={s} className="cursor-pointer rounded-md px-3 py-2 text-xs data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700">
                                  <Select.ItemText>{t(`recruitment.status.${s}`)}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </td>
                  </tr>
                ))}
                {applicants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">{t('common.noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {positionDialog.open && (
        <PositionDialog
          position={positionDialog.position}
          departments={departments}
          onClose={() => setPositionDialog({ open: false, position: null })}
          onSaved={load}
        />
      )}
      {applicantDialog && (
        <ApplicantDialog positions={positions} onClose={() => setApplicantDialog(false)} onSaved={load} />
      )}
    </section>
  );
}
