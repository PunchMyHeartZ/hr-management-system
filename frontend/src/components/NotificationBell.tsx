// ==============================
// กระดิ่งแจ้งเตือน — แสดงจำนวนใบลารออนุมัติและประกาศล่าสุด (โหลดใหม่ทุก 60 วินาที)
// ==============================
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CalendarClock, Megaphone } from 'lucide-react';
import { api } from '../api/client';
import type { Announcement } from '../api/schemas';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

/** กระดิ่งแจ้งเตือน — badge รวม (ใบลา pending + ประกาศใหม่) และ dropdown คลิกเพื่อกระโดดไปหน้าที่เกี่ยวข้อง */
export default function NotificationBell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { goTab } = useNav();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  // เฉพาะ HR/Executive เท่านั้นที่เห็นตัวเลขใบลารออนุมัติ
  const isApprover = user?.role === 'hr' || user?.role === 'executive';

  // ส่วนดึงข้อมูล: โหลดใบลา pending (เฉพาะ approver) และประกาศ โดยรีเฟรชทุก 60 วินาที
  useEffect(() => {
    const load = () => {
      if (isApprover) {
        api
          .getLeaves()
          .then((leaves) => setPendingCount(leaves.filter((l) => l.status === 'pending').length))
          .catch(() => {});
      }
      api.getAnnouncements().then(setAnnouncements).catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [isApprover]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง (click-outside)
  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const latest = announcements.slice(0, 3);
  // ตัวเลขรวมบน badge = ใบลา pending + ประกาศ 3 รายการล่าสุด
  const badge = pendingCount + latest.length;

  return (
    <div ref={boxRef} className="relative">
      {/* ปุ่มกระดิ่งพร้อม badge แสดงจำนวน (เกิน 9 แสดง "9+") */}
      <button
        type="button"
        aria-label={t('notifications.title')}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {/* ส่วน dropdown รายการแจ้งเตือน */}
      {open && (
        <div className="panel-in absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
            {t('notifications.title')}
          </div>
          <div className="max-h-80 divide-y divide-slate-50 overflow-y-auto">
            {/* แถวใบลารออนุมัติ (เฉพาะ approver) — คลิกไปหน้าการลา */}
            {isApprover && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  goTab('leaves');
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-azure-50/60"
              >
                <span className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-600">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <span className="text-sm text-slate-700">
                  {pendingCount > 0 ? (
                    <>
                      <span className="font-bold text-amber-700">{pendingCount}</span>{' '}
                      {t('notifications.pendingLeaves')}
                    </>
                  ) : (
                    t('notifications.empty')
                  )}
                </span>
              </button>
            )}
            {/* รายการประกาศล่าสุด — คลิกไปหน้า dashboard */}
            {latest.map((a) => (
              <button
                key={a.announcement_id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  goTab('dashboard');
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-azure-50/60"
              >
                <span className="mt-0.5 rounded-lg bg-azure-50 p-2 text-azure-600">
                  <Megaphone className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{a.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{a.body}</span>
                </span>
              </button>
            ))}
            {!isApprover && latest.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">{t('notifications.empty')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
