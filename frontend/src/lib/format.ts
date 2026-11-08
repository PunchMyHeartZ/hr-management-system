// ==============================
// ฟังก์ชันช่วยจัดรูปแบบการแสดงผล — วันที่และจำนวนเงิน (รองรับ locale ไทย/อังกฤษ)
// ==============================

/** แปลงวันที่ ISO (YYYY-MM-DD) เป็นข้อความสั้นตาม locale เช่น "15 ม.ค. 2568" */
export function formatDate(isoDate: string | null | undefined, locale = 'en-US'): string {
  if (!isoDate) return '-';
  // ต่อ T00:00:00 เพื่อบังคับตีความเป็นเที่ยงคืน local time ไม่ให้เพี้ยนข้ามวันจาก timezone
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** แปลงตัวเลขเป็นสกุลเงินบาท (THB) แบบไม่มีทศนิยม เช่น "฿45,000" */
export function formatMoney(value: number | null | undefined, locale = 'en-US'): string {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number(value));
}
