// ==============================
// ปฏิทินการลา — เดือนละหน้า แสดงใครลาวันไหน แยกสีตามประเภทการลา (ไม่รวมที่ถูกปฏิเสธ)
// ==============================
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import type { LeaveRequest } from '../api/schemas';
import { SkeletonTable } from '../components/Skeleton';
import Avatar from '../components/Avatar';

// สีป้ายการลาตามประเภท (annual/sick/personal/unpaid)
const TYPE_COLORS: Record<string, string> = {
  annual: 'bg-azure-50 text-azure-700',
  sick: 'bg-rose-50 text-rose-700',
  personal: 'bg-indigo-50 text-indigo-700',
  unpaid: 'bg-amber-50 text-amber-700',
};

/** แปลง Date เป็น key รูปแบบ YYYY-MM-DD (เติม 0 ข้างหน้า) สำหรับ index ในปฏิทิน */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** หน้าปฏิทินการลา — เลื่อนดูเดือนก่อนหน้า/ถัดไป และไฮไลต์วันปัจจุบัน */
export default function LeaveCalendarPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
  const today = new Date();
  // ส่วน state: เดือน/ปีที่แสดง, รายการลา, สถานะโหลด
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ส่วนดึงข้อมูล: โหลดคำขอลาทั้งหมด (ครั้งเดียว)
  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getLeaves()
      .then(setLeaves)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // สร้าง index แผนที่ "วัน -> รายการลา" โดยขยายช่วง start-end เป็นรายวัน (ข้ามใบที่ถูกปฏิเสธ)
  const byDay = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const l of leaves) {
      if (l.status === 'rejected') continue;
      const start = new Date(`${l.start_date}T00:00:00`);
      const end = new Date(`${l.end_date}T00:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        map.set(key, [...(map.get(key) ?? []), l]);
      }
    }
    return map;
  }, [leaves]);

  // คำนวณตารางเดือน: วันแรกตรง weekday ไหน (ช่องว่างนำหน้า = null) และเติมช่องท้ายให้ครบสัปดาห์
  const firstDay = new Date(year, month, 1);
  // เคล็ดลับ: new Date(year, month+1, 0) = วันสุดท้ายของเดือน
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthTitle = firstDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  // เลื่อนเดือน +/- 1 (จัดการข้ามปีให้เองผ่าน Date constructor)
  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };
  const todayKey = toDateKey(today);

  return (
    <section>
      {/* ส่วนหัวหน้า: ชื่อเดือน + ปุ่มเลื่อนเดือนก่อนหน้า/ถัดไป */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('calendar.title')}</h2>
          <p className="text-sm text-slate-500">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t('calendar.prevMonth')}
            onClick={() => shift(-1)}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-slate-900">{monthTitle}</span>
          <button
            type="button"
            aria-label={t('calendar.nextMonth')}
            onClick={() => shift(1)}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && <SkeletonTable rows={5} cols={7} />}
      {error && <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('common.error')}: {error}</p>}

      {/* ส่วนแสดงตารางปฏิทิน: แถวหัวชื่อวัน + เซลล์วันที่ */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* แถวหัว: ชื่อวัน (อา-ส) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {(t('calendar.weekdays', { returnObjects: true }) as string[]).map((wd, i) => (
              <div key={i} className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                {wd}
              </div>
            ))}
          </div>
          {/* เซลล์แต่ละวัน: ไฮไลต์วันนี้ และแสดงรายการลาสูงสุด 3 รายการต่อวัน */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const key = day ? toDateKey(new Date(year, month, day)) : null;
              const dayLeaves = key ? byDay.get(key) ?? [] : [];
              const isToday = key === todayKey;
              return (
                <div
                  key={i}
                  className={`min-h-[6.5rem] border-b border-r border-slate-100 p-1.5 transition-colors ${
                    day ? 'hover:bg-slate-50/70' : 'bg-slate-50/50'
                  } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {day && (
                    <>
                      <div
                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday ? 'bg-azure-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayLeaves.slice(0, 3).map((l) => (
                          <div
                            key={`${l.leave_id}-${key}`}
                            title={`${l.employee_name} · ${t(`leaves.types.${l.leave_type}`)}${l.status === 'pending' ? ' (pending)' : ''}`}
                            className={`flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                              TYPE_COLORS[l.leave_type] ?? 'bg-slate-100 text-slate-600'
                            } ${l.status === 'pending' ? 'opacity-60 ring-1 ring-inset ring-slate-300' : ''}`}
                          >
                            <Avatar id={l.employee_id} name={l.employee_name} size="sm" />
                            <span className="truncate">{l.employee_name.split(' ')[0]}</span>
                          </div>
                        ))}
                        {dayLeaves.length > 3 && (
                          <div className="px-1 text-[10px] font-medium text-slate-400">+{dayLeaves.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
