// ==============================
// การ์ดประกาศ — แสดงประกาศล่าสุด (สูงสุด 4 รายการ) พร้อมปุ่มเพิ่ม/ลบ สำหรับ HR และ Executive
// ==============================
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { announcementFormSchema, firstIssueMessage } from '../api/schemas';
import type { Announcement } from '../api/schemas';
import { btnPrimary } from '../lib/ui';
import { useAuth } from '../context/AuthContext';

const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

/** Dialog ฟอร์มสร้างประกาศใหม่ — validate ด้วย zod แล้วส่งไป API, ปิดเมื่อสำเร็จ */
function AnnouncementFormDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  // ส่วน state ของฟอร์ม (หัวข้อ, เนื้อหา, error, สถานะบันทึก)
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ส่วน event handler: ตรวจฟอร์มแล้วบันทึกประกาศ
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = announcementFormSchema.safeParse({ title, body });
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createAnnouncement(parsed.data);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">{t('announcements.add')}</Dialog.Title>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('announcements.titleField')} *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required maxLength={200} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t('announcements.bodyField')} *</span>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('announcements.bodyPlaceholder')}
                className={inputCls}
                required
              />
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

/** การ์ดประกาศบน dashboard — โหลดรายการล่าสุด, เพิ่ม/ลบได้ (เฉพาะ HR/Executive) */
export default function AnnouncementsCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // เฉพาะ HR/Executive เท่านั้นที่โพสต์/ลบประกาศได้
  const canPost = user?.role === 'hr' || user?.role === 'executive';
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ส่วนดึงข้อมูล: โหลดประกาศทั้งหมด (ถ้าพลาดแสดงเป็นชุดว่าง)
  const load = useCallback(() => {
    setLoading(true);
    api
      .getAnnouncements()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ลบประกาศ (มี confirm) แล้วโหลดรายการใหม่
  const remove = async (id: number) => {
    if (!window.confirm(t('announcements.deleteConfirm'))) return;
    try {
      await api.deleteAnnouncement(id);
      load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <div className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* ส่วนหัวการ์ด + ปุ่มเพิ่มประกาศ (เฉพาะผู้มีสิทธิ์) */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Megaphone className="h-4 w-4 text-azure-600" />
          {t('announcements.title')}
        </h3>
        {canPost && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-azure-50 px-2.5 py-1.5 text-xs font-semibold text-azure-700 transition hover:bg-azure-100"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('announcements.add')}
          </button>
        )}
      </div>

      {/* skeleton ขณะโหลด */}
      {loading && <div className="space-y-3">
        {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
      </div>}

      {/* กรณีไม่มีประกาศ */}
      {!loading && items.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">{t('announcements.empty')}</p>
      )}

      {/* ส่วนรายการประกาศ 4 รายการล่าสุด */}
      <div className="space-y-3">
        {items.slice(0, 4).map((a) => (
          <div key={a.announcement_id} className="group rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-slate-900">{a.title}</div>
              {canPost && (
                <button
                  type="button"
                  onClick={() => remove(a.announcement_id)}
                  aria-label={t('departments.delete')}
                  className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.body}</p>
            <div className="mt-2 text-xs text-slate-400">
              {t('announcements.by')} {a.author_name ?? '-'} · {new Date(a.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* เปิด dialog สร้างประกาศ */}
      {dialogOpen && <AnnouncementFormDialog onClose={() => setDialogOpen(false)} onCreated={load} />}
    </div>
  );
}
