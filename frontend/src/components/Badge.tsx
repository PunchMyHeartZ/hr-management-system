// ==============================
// Badge สถานะ — ป้ายวงกลมเล็ก ๆ แสดงสถานะ (active/pending/approved/...) พร้อมสีตามสถานะ
// ==============================
import { useTranslation } from 'react-i18next';

// จับคูสี (พื้นหลัง/ตัวอักษร/ring) ตามสถานะ
const STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  terminated: 'bg-red-50 text-red-700 ring-red-600/20',
};

// key ของคำแปล (i18n) สำหรับแต่ละสถานะ
const LABEL_KEYS: Record<string, string> = {
  active: 'employees.status.active',
  inactive: 'employees.status.inactive',
  terminated: 'employees.status.terminated',
  pending: 'leaves.status.pending',
  approved: 'leaves.status.approved',
  rejected: 'leaves.status.rejected',
};

/** ป้ายสถานะ — รับ status string แล้วแสดงสี+ข้อความที่แปลแล้ว (fallback เป็นสีเทา/inactive) */
export default function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        STYLES[status] ?? STYLES.inactive
      }`}
    >
      {t(LABEL_KEYS[status] ?? status)}
    </span>
  );
}
