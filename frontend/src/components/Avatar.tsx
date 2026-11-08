// ==============================
// Avatar รูปโปรไฟล์พนักงาน — ดึงภาพจาก randomuser.me ตาม id ถ้าโหลดไม่ได้แสดงชื่อย่อแทน
// ==============================
import { useState } from 'react';

// ชุดสีพื้นหลังสำหรับ avatar แบบชื่อย่อ
const PALETTE = [
  'bg-azure-600',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-teal-600',
  'bg-slate-500',
  'bg-cyan-700',
  'bg-blue-800',
  'bg-rose-400',
];

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  id?: number | null;
  name?: string;
  size?: AvatarSize;
}

// Deterministic mock portrait per employee id (randomuser.me static files)
/** สร้าง URL รูปโปรไฟล์จำลองแบบ deterministic — id เดียวได้รูปเดิมเสมอ (เลขคู่=ผู้หญิง, เลขคี่=ผู้ชาย) */
function portraitUrl(employeeId: number): string {
  // คูณ 13 แล้ว mod 100 เพื่อกระจายรูปที่หลากหลายจาก id ที่ต่อเนื่องกัน
  const gender = employeeId % 2 === 0 ? 'women' : 'men';
  const idx = (employeeId * 13) % 100;
  return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
}

/** Avatar พนักงาน — แสดงรูปจาก id ถ้าโหลดล้มเหลวหรือไม่มี id จะแสดงวงกลมชื่อย่อ (initials) */
export default function Avatar({ id, name = '', size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const sizeCls = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const textCls = size === 'lg' ? 'text-sm' : 'text-[10px]';
  // ตัดเอาอักขระแรกของแต่ละคำ สูงสุด 2 คำ มาเป็นชื่อย่อ เช่น "Somchai Jaidee" -> "SJ"
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  // เลือกสีพื้นหลังจาก id แบบ deterministic (abs กันค่าติดลบ)
  const bg = id == null ? PALETTE[0] : PALETTE[Math.abs(id) % PALETTE.length];

  // ส่วน fallback: แสดงวงกลมชื่อย่อเมื่อโหลดรูปไม่สำเร็จหรือไม่มี id
  if (failed || !id) {
    return (
      <div
        className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full ${bg} font-bold text-white ${textCls}`}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={portraitUrl(id)}
      alt={name}
      onError={() => setFailed(true)}
      loading="lazy"
      className={`${sizeCls} shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white`}
    />
  );
}
