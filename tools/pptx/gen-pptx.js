// Generates HR-System-Presentation.pptx (modern Thai deck, 16:9)
/*
 * สคริปต์สร้างไฟล์นำเสนอ HR-System-Presentation.pptx (สไลด์ภาษาไทย, 16:9)
 * ผลลัพธ์ถูกบันทึกไว้ที่โฟลเดอร์รากของโปรเจกต์ (ออกจาก tools/pptx สองระดับ)
 * วิธีรัน: node gen-pptx.js (รันจากโฟลเดอร์ tools/pptx นี้)
 *   ต้องติดตั้ง dependency ก่อน: npm install pptxgenjs
 *   เมื่อสำเร็จจะพิมพ์ "CREATED: <ตำแหน่งไฟล์>" ออกทาง console
 */
const path = require('path');
const PptxGenJS = require('pptxgenjs');

// C = ชุดสี (design tokens) ที่ใช้ทั้งเด็ค, FONT = ฟอนต์หลักสำหรับข้อความไทย, MONO = ฟอนต์โค้ด/ชื่อตาราง
const C = {
  indigo: '4F46E5', violet: '7C3AED', dark: '0F172A', slate: '334155',
  gray: '64748B', light: 'F5F6FA', white: 'FFFFFF', border: 'E2E8F0',
  amber: 'B45309', green: '15803D', rose: 'BE123C', sky: '0EA5E9',
  indigoSoft: 'EEF2FF', indigoText: '3730A3', lightGray: '94A3B8',
};
const FONT = 'Leelawadee UI';
const MONO = 'Consolas';

// สร้าง PptxGenJS instance และตั้งค่าเด็ค: layout กว้าง 16:9, ผู้สร้าง, ชื่อเรื่อง
const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
pptx.layout = 'WIDE';
pptx.author = 'HR System Project';
pptx.title = 'HR Management System';

// ตัวนับเลขหน้าสไลด์ (เริ่มพิมพ์เลขหน้าจริงตั้งแต่หน้าที่ 2)
let pageNo = 0;

// สร้างสไลด์ใหม่พร้อมโครงหัวกระดาษมาตรฐาน: แท็บ kicker, ชื่อเรื่อง (title),
//   หัวข้อรอง (sub), เลขหน้ามุมล่างขวา และวงกลมตกแต่งที่มุมสไลด์
function baseSlide(kicker, title, sub) {
  const s = pptx.addSlide();
  s.background = { color: C.light };
  s.addShape(pptx.ShapeType.ellipse, { x: 12.42, y: -0.52, w: 1.35, h: 1.35, fill: { color: C.indigoSoft } });
  s.addShape(pptx.ShapeType.ellipse, { x: 12.88, y: 0.55, w: 0.34, h: 0.34, fill: { color: 'DDD6FE' } });
  s.addShape(pptx.ShapeType.ellipse, { x: 0.18, y: 7.06, w: 0.52, h: 0.52, fill: { color: 'F5F3FF' } });
  const kw = Math.max(1.6, kicker.length * 0.115);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 0.42, w: kw, h: 0.34, fill: { color: C.indigo }, rectRadius: 0.17 });
  s.addText(kicker, { x: 0.6, y: 0.42, w: kw, h: 0.34, fontSize: 10.5, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
  s.addText(title, { x: 0.6, y: 0.86, w: 12.1, h: 0.62, fontSize: 27, bold: true, color: C.dark, fontFace: FONT });
  if (sub) s.addText(sub, { x: 0.6, y: 1.46, w: 12.1, h: 0.38, fontSize: 13, color: C.gray, fontFace: FONT });
  pageNo += 1;
  if (pageNo > 1) s.addText(String(pageNo), { x: 12.65, y: 7.08, w: 0.5, h: 0.3, fontSize: 10, color: C.lightGray, align: 'right', fontFace: FONT });
  return s;
}

// วาดป้ายไอคอนวงกลม (icon badge) บนสไลด์ s ที่ตำแหน่ง x,y พื้นสี color
//   glyph กำหนดรูปไอคอนที่วาดด้วย shape เช่น users, calendar, clock, banknote
function iconBadge(s, x, y, color, glyph) {
  const g = { fill: { color: C.white }, line: { type: 'none' } };
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: 0.46, h: 0.46, fill: { color } });
  switch (glyph) {
    case 'users':
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.15, y: y + 0.09, w: 0.16, h: 0.16, ...g });
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.10, y: y + 0.27, w: 0.26, h: 0.12, rectRadius: 0.06, ...g });
      break;
    case 'calendar':
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.11, y: y + 0.13, w: 0.24, h: 0.21, rectRadius: 0.03, ...g });
      s.addShape(pptx.ShapeType.rect, { x: x + 0.11, y: y + 0.19, w: 0.24, h: 0.03, fill: { color } });
      break;
    case 'clock':
      s.addShape(pptx.ShapeType.donut, { x: x + 0.10, y: y + 0.10, w: 0.26, h: 0.26, ...g });
      break;
    case 'banknote':
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.08, y: y + 0.14, w: 0.30, h: 0.19, rectRadius: 0.03, ...g });
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.19, y: y + 0.185, w: 0.09, h: 0.09, fill: { color } });
      break;
    case 'award':
      s.addShape(pptx.ShapeType.diamond, { x: x + 0.14, y: y + 0.08, w: 0.18, h: 0.18, ...g });
      s.addShape(pptx.ShapeType.rect, { x: x + 0.13, y: y + 0.27, w: 0.07, h: 0.10, ...g });
      s.addShape(pptx.ShapeType.rect, { x: x + 0.26, y: y + 0.27, w: 0.07, h: 0.10, ...g });
      break;
    case 'briefcase':
      s.addShape(pptx.ShapeType.rect, { x: x + 0.18, y: y + 0.12, w: 0.10, h: 0.06, ...g });
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.10, y: y + 0.18, w: 0.26, h: 0.16, rectRadius: 0.03, ...g });
      break;
    case 'megaphone':
      s.addShape(pptx.ShapeType.triangle, { x: x + 0.13, y: y + 0.14, w: 0.20, h: 0.18, rotate: 90, ...g });
      s.addShape(pptx.ShapeType.rect, { x: x + 0.10, y: y + 0.30, w: 0.06, h: 0.06, ...g });
      break;
    case 'shield':
      s.addShape(pptx.ShapeType.diamond, { x: x + 0.13, y: y + 0.07, w: 0.20, h: 0.32, ...g });
      break;
  }
}

// วาดการ์ดขาวขอบมน พร้อมแถบสี accent ด้านซ้าย หัวข้อ title และเนื้อหา body
//   (ถ้าส่ง icon มาด้วยจะวาด iconBadge ไว้ข้างหัวข้อ)
function card(s, x, y, w, h, title, body, accent = C.indigo, bodySize = 11, icon = null) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.09 });
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: accent } });
  if (icon) {
    iconBadge(s, x + 0.18, y + 0.13, accent, icon);
    s.addText(title, { x: x + 0.76, y: y + 0.13, w: w - 0.9, h: 0.46, fontSize: 12.5, bold: true, color: C.dark, valign: 'middle', fontFace: FONT });
    s.addText(body, { x: x + 0.2, y: y + 0.68, w: w - 0.34, h: h - 0.8, fontSize: bodySize, color: C.gray, fontFace: FONT, valign: 'top' });
  } else {
    s.addText(title, { x: x + 0.2, y: y + 0.1, w: w - 0.32, h: 0.34, fontSize: 13, bold: true, color: C.dark, fontFace: FONT });
    s.addText(body, { x: x + 0.2, y: y + 0.44, w: w - 0.34, h: h - 0.56, fontSize: bodySize, color: C.gray, fontFace: FONT, valign: 'top' });
  }
}

// วาดชิปป้ายข้อความรูปแคปซูล (pill) ตัวอักษรสี fg บนพื้น bg ใช้แสดง tag เช่นชื่อเทคโนโลยี
function chip(s, x, y, text, fg, bg, w = 1.45) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.32, fill: { color: bg }, rectRadius: 0.16 });
  s.addText(text, { x, y, w, h: 0.32, fontSize: 10, bold: true, color: fg, align: 'center', valign: 'middle', fontFace: FONT });
}

// วาดกล่องตารางฐานข้อมูลสำหรับ ER diagram: หัวสี headerColor พร้อมชื่อตาราง name
//   และรายการ fields (แถวที่เป็น PK สีเหลือง, FK สีเขียว)
function entity(s, x, y, w, h, name, fields, headerColor = C.indigo) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.white }, line: { color: headerColor, width: 1.5 }, rectRadius: 0.07 });
  s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.38, fill: { color: headerColor } });
  s.addText(name, { x, y, w, h: 0.38, fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: MONO });
  const runs = fields.map((f, i) => ({
    text: f.t + (i < fields.length - 1 ? '\n' : ''),
    options: { color: f.pk ? C.amber : f.fk ? C.green : C.slate, bold: !!(f.pk || f.fk), breakLine: false },
  }));
  s.addText(runs, { x: x + 0.14, y: y + 0.46, w: w - 0.26, h: h - 0.56, fontSize: 9.5, fontFace: MONO, valign: 'top', lineSpacingMultiple: 1.12 });
}

/* ---------- SLIDE 1 : TITLE ---------- */
// SLIDE 1: TITLE — หน้าปก ชื่อโปรเจกต์ไทย/อังกฤษ + ชิปสรุปเทคโนโลยีที่ใช้
{
  const s = pptx.addSlide();
  s.background = { color: C.dark };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.indigo } });
  s.addShape(pptx.ShapeType.rect, { x: 6.67, y: 0, w: 6.66, h: 0.12, fill: { color: C.violet } });
  s.addShape(pptx.ShapeType.ellipse, { x: 9.4, y: 1.05, w: 3.5, h: 3.5, fill: { color: C.indigo, transparency: 72 }, line: { color: '6366F1', width: 1 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 10.45, y: 2.1, w: 1.4, h: 1.4, fill: { color: C.violet, transparency: 40 } });
  s.addShape(pptx.ShapeType.donut, { x: 9.0, y: 4.35, w: 1.05, h: 1.05, fill: { color: 'A5B4FC', transparency: 55 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 11.95, y: 4.75, w: 0.7, h: 0.7, fill: { color: 'F472B6', transparency: 50 } });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 1.55, w: 1.5, h: 0.4, fill: { color: C.indigo }, rectRadius: 0.2 });
  s.addText('PROJECT PRESENTATION', { x: 0.9, y: 1.55, w: 1.5, h: 0.4, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
  s.addText('ระบบบริหารทรัพยากรบุคคล', { x: 0.9, y: 2.15, w: 11.5, h: 0.95, fontSize: 44, bold: true, color: C.white, fontFace: FONT });
  s.addText('HR Management System', { x: 0.9, y: 3.1, w: 11.5, h: 0.6, fontSize: 26, bold: true, color: 'A5B4FC', fontFace: FONT });
  s.addText('พนักงาน • การลา • เวลาทำงาน/OT • เงินเดือน/ประกันสังคม/ภาษี • ประกวดผลงาน • รับสมัครงาน • สิทธิ์ 3 ระดับ • รองรับ 2 ภาษา', { x: 0.9, y: 3.85, w: 11.5, h: 0.4, fontSize: 13, color: 'CBD5E1', fontFace: FONT });
  const chips = [
    ['Vite + React', C.indigoText, C.indigoSoft], ['TypeScript', C.indigoText, C.indigoSoft], ['Tailwind CSS', C.indigoText, C.indigoSoft], ['Radix UI', C.indigoText, C.indigoSoft],
    ['Express', C.green, 'DCFCE7'], ['JWT + bcrypt', C.green, 'DCFCE7'], ['Prisma ORM', C.green, 'DCFCE7'],
    ['PostgreSQL 18', C.amber, 'FEF3C7'], ['pgAdmin', C.amber, 'FEF3C7'],
    ['i18next', C.rose, 'FFE4E6'], ['Recharts', C.rose, 'FFE4E6'],
  ];
  chips.forEach((c, i) => chip(s, 0.9 + (i % 6) * 1.62, 4.6 + Math.floor(i / 6) * 0.45, c[0], c[1], c[2], 1.5));
  pageNo += 1;
}

/* ---------- SLIDE 2 : FEATURES ---------- */
// SLIDE 2: FEATURES — ฟีเจอร์หลัก 8 ข้อของระบบ เรียงเป็นการ์ดพร้อมไอคอน
{
  const s = baseSlide('OVERVIEW', 'ฟีเจอร์หลักของระบบ', 'พัฒนาครบทั้ง Frontend, Backend และ Database');
  const feats = [
    ['จัดการพนักงาน', 'เพิ่ม/แก้ไข/ค้นหา/กรองแผนก • สถานะการทำงาน • สิทธิ์วันลาคงเหลือ', C.indigo, 'users'],
    ['การลา + ปฏิทิน', 'ยื่นใบลา 4 ประเภท • อนุมัติ/ไม่อนุมัติ • ปฏิทินการลารายเดือน', C.violet, 'calendar'],
    ['เวลาทำงาน + OT', 'บันทึกเข้า-ออกงาน • คิด OT อัตโนมัติ = ชั่วโมงที่เกิน 8 ชม. (หักพักเที่ยง 1 ชม.)', '0284C7', 'clock'],
    ['Payroll Engine', 'ประกันสังคม 5% (สูงสุด 750) • ภาษีขั้นบันได 0-35% • โบนัส • ส่งออก CSV', C.green, 'banknote'],
    ['ประกวดผลงาน', 'รีวิวรายปี + เป้าหมาย (Goals) ถ่วงน้ำหนักคะแนน • จุดแข็ง/จุดพัฒนา', C.amber, 'award'],
    ['รับสมัครงาน', 'ตำแหน่งที่เปิดรับ (Headcount) • ผู้สมัคร • อัปเดตสถานะ Pipeline', C.rose, 'briefcase'],
    ['ประกาศบริษัท', 'ฝ่ายบุคคลโพสต์ข่าวสาร • กระดิ่งแจ้งเตือนบน Dashboard', C.indigo, 'megaphone'],
    ['สิทธิ์ 3 ระดับ', 'HR / ผู้บริหาร / พนักงาน — Self-service: โปรไฟล์ ใบลา สลิปเงินเดือนของตัวเอง', C.violet, 'shield'],
  ];
  feats.forEach((f, i) => {
    const x = 0.6 + (i % 4) * 3.12, y = 2.05 + Math.floor(i / 4) * 2.35;
    card(s, x, y, 2.92, 2.15, f[0], f[1], f[2], 10, f[3]);
  });
}

/* ---------- SLIDE 3 : DASHBOARD PREVIEW ---------- */
// SLIDE 3: DASHBOARD PREVIEW — จำลองหน้า Dashboard: KPI cards + กราฟแท่งค่าจ่ายรายเดือน + โดนัทสัดส่วนวันลา
{
  const s = baseSlide('DASHBOARD PREVIEW', 'ภาพรวมในหน้าเดียว — KPI + กราฟ', 'ตัวอย่างหน้า Dashboard (บนเว็บจริงวาดด้วย Recharts)');
  const kpis = [
    ['พนักงานทั้งหมด', '48', C.indigo],
    ['กำลังทำงาน', '42', C.green],
    ['ใบลารออนุมัติ', '5', C.amber],
    ['ค่าจ่ายรวมเดือนนี้', '1.82M', C.violet],
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.12;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.95, w: 2.92, h: 1.0, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.09 });
    s.addShape(pptx.ShapeType.rect, { x, y: 1.95, w: 0.07, h: 1.0, fill: { color: k[2] } });
    s.addText(k[0], { x: x + 0.2, y: 2.04, w: 2.6, h: 0.3, fontSize: 10.5, color: C.gray, fontFace: FONT });
    s.addText(k[1], { x: x + 0.2, y: 2.3, w: 2.6, h: 0.58, fontSize: 23, bold: true, color: k[2], fontFace: FONT });
  });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 3.2, w: 7.2, h: 3.95, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
  s.addText('ค่าจ่ายรวมรายเดือน (ล้านบาท)', { x: 0.85, y: 3.32, w: 6.7, h: 0.32, fontSize: 12, bold: true, color: C.dark, fontFace: FONT });
  s.addChart(pptx.ChartType.bar, [
    {
      name: 'ค่าจ่ายรวม',
      labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
      values: [1.52, 1.48, 1.55, 1.50, 1.58, 1.62, 1.60, 1.66, 1.70, 1.74, 1.80, 1.82],
    },
  ], {
    x: 0.8, y: 3.7, w: 6.8, h: 3.3,
    chartColors: [C.indigo],
    barGapWidthPct: 45,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
    showLegend: false,
  });
  s.addShape(pptx.ShapeType.roundRect, { x: 8.05, y: 3.2, w: 4.65, h: 3.95, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
  s.addText('สัดส่วนวันลาแยกประเภท (ปีนี้)', { x: 8.3, y: 3.32, w: 4.2, h: 0.32, fontSize: 12, bold: true, color: C.dark, fontFace: FONT });
  s.addChart(pptx.ChartType.doughnut, [
    { name: 'วันลา', labels: ['พักร้อน', 'ป่วย', 'กิจส่วนตัว', 'ไม่รับค่าจ้าง'], values: [45, 25, 18, 12] },
  ], {
    x: 8.3, y: 3.65, w: 4.15, h: 3.35,
    chartColors: [C.indigo, C.violet, 'F59E0B', 'F43F5E'],
    holeSize: 62,
    showLegend: true, legendPos: 'b', legendFontSize: 9, legendFontFace: FONT,
    showPercent: true, dataLabelFontSize: 9, dataLabelColor: 'FFFFFF', dataLabelFontFace: FONT,
  });
}

/* ---------- SLIDE 3 : ARCHITECTURE ---------- */
// SLIDE 3: ARCHITECTURE — สถาปัตยกรรม 3-Tier (Frontend/API/Database) + การ์ดสื่อสาร ความปลอดภัย ธุรกรรม
{
  const s = baseSlide('ARCHITECTURE', 'สถาปัตยกรรมระบบ', '3-Tier Architecture — แยกชั้นชัดเจน');
  const tiers = [
    ['Frontend', 'Vite + React 18 + TypeScript', 'Tailwind CSS v4 • Radix UI', 'i18next (TH/EN) • Recharts', C.indigo],
    ['Backend REST API', 'Node.js + Express + TypeScript', 'JWT Auth Middleware', 'Role-based Access (HR/Exec/Employee)', C.green],
    ['PostgreSQL 18', '12 Tables + Constraints', 'pg Pool + Prisma ORM', 'จัดการผ่าน pgAdmin', C.amber],
  ];
  tiers.forEach((t, i) => {
    const x = 0.9 + i * 4.35;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.1, w: 3.4, h: 1.9, fill: { color: C.white }, line: { color: t[4], width: 2 }, rectRadius: 0.1 });
    s.addText(t[0], { x, y: 2.2, w: 3.4, h: 0.4, fontSize: 16, bold: true, color: C.dark, align: 'center', fontFace: FONT });
    [t[1], t[2], t[3]].forEach((l, j) => {
      s.addText(l, { x, y: 2.62 + j * 0.42, w: 3.4, h: 0.4, fontSize: 11, color: C.gray, align: 'center', fontFace: FONT });
    });
    if (i < 2) {
      s.addShape(pptx.ShapeType.rightArrow, { x: x + 3.48, y: 2.85, w: 0.78, h: 0.4, fill: { color: 'A5B4FC' } });
      s.addText('REST / JSON\n+ Bearer Token', { x: x + 3.3, y: 3.3, w: 1.15, h: 0.55, fontSize: 8, color: C.gray, align: 'center', fontFace: FONT });
    }
  });
  card(s, 0.9, 4.6, 3.85, 1.7, 'การสื่อสาร', 'REST API (JSON) ผ่าน fetch พร้อม Authorization: Bearer <JWT>', C.indigo);
  card(s, 5.0, 4.6, 3.85, 1.7, 'ความปลอดภัย', 'bcrypt hash รหัสผ่าน (10 rounds) + JWT หมดอายุ 7 วัน + ตรวจ role ทุก request', C.violet);
  card(s, 9.1, 4.6, 3.6, 1.7, 'ธุรกรรม', 'คำนวณ Payroll ทั้งเดือนด้วย Transaction (BEGIN / COMMIT / ROLLBACK)', C.green);
}

/* ---------- SLIDE 4 : ER CORE ---------- */
// SLIDE 4: ER CORE — ER diagram ตารางแกนหลัก departments -> employees -> leave_requests
{
  const s = baseSlide('ENTITY DESIGN 1/2', 'เอนทิตี้หลัก — ข้อมูลองค์กรและการลา', 'ความสัมพันธ์แบบ One-to-Many (1 ──∞)');
  entity(s, 0.6, 2.1, 3.0, 3.3, 'departments', [
    { t: 'PK  department_id SERIAL' },
    { t: '    department_name UNIQUE' },
    { t: '    department_code UNIQUE' },
    { t: '    created_at' },
  ]);
  s.addText('1 ──∞', { x: 3.72, y: 3.4, w: 0.85, h: 0.4, fontSize: 14, bold: true, color: C.violet, align: 'center', fontFace: FONT });
  entity(s, 4.65, 2.1, 3.6, 4.5, 'employees', [
    { t: 'PK  employee_id SERIAL' },
    { t: '    first_name / last_name' },
    { t: '    email UNIQUE' },
    { t: '    position, phone' },
    { t: '    hire_date DATE' },
    { t: 'FK  department_id -> departments' },
    { t: '    salary NUMERIC(12,2) >= 0' },
    { t: '    status CHECK(3 values)' },
    { t: '    annual_leave_quota INT' },
  ]);
  s.addText('1 ──∞', { x: 8.37, y: 3.4, w: 0.85, h: 0.4, fontSize: 14, bold: true, color: C.violet, align: 'center', fontFace: FONT });
  entity(s, 9.3, 2.1, 3.4, 4.5, 'leave_requests', [
    { t: 'PK  leave_id SERIAL' },
    { t: 'FK  employee_id -> employees' },
    { t: '    leave_type CHECK(4 types)' },
    { t: '    start_date DATE' },
    { t: '    end_date DATE (>= start)' },
    { t: '    status CHECK(pending/' },
    { t: '        approved/rejected)' },
    { t: '    reason TEXT' },
  ], C.violet);
  s.addText('FK แผนก: ON DELETE RESTRICT (กันลบแผนกที่ยังมีพนักงาน)   •   FK พนักงาน: ON DELETE CASCADE (ลบพนักงานแล้วข้อมูลย่อยถูกลบตาม)', { x: 0.6, y: 6.85, w: 12.1, h: 0.35, fontSize: 10.5, color: C.lightGray, fontFace: FONT });
}

/* ---------- SLIDE 5 : ER PAYROLL + USERS ---------- */
// SLIDE 5: ER PAYROLL + USERS — ตารางกลุ่มเงินเดือน (attendance/bonuses/payroll_records) และ users
{
  const s = baseSlide('ENTITY DESIGN 2/2', 'เอนทิตี้เงินเดือนและผู้ใช้งาน', 'ทุกตารางผูกกับ employees ด้วย FK (ON DELETE CASCADE)');
  entity(s, 0.6, 2.1, 3.0, 3.5, 'attendance', [
    { t: 'PK  attendance_id' },
    { t: 'FK  employee_id' },
    { t: '    work_date DATE' },
    { t: '    check_in / check_out TIME' },
    { t: '    ot_hours NUMERIC(5,2)' },
    { t: 'UQ  (employee_id, work_date)' },
  ], C.sky);
  entity(s, 3.85, 2.1, 2.85, 3.5, 'bonuses', [
    { t: 'PK  bonus_id' },
    { t: 'FK  employee_id' },
    { t: '    bonus_year INT' },
    { t: '    amount >= 0' },
    { t: 'UQ  (employee_id, year)' },
  ], C.green);
  entity(s, 6.95, 2.1, 3.1, 4.3, 'payroll_records', [
    { t: 'PK  payroll_id' },
    { t: 'FK  employee_id' },
    { t: '    pay_period_year/month' },
    { t: '    base_salary' },
    { t: '    ot_hours, ot_pay' },
    { t: '    bonus, sso, tax' },
    { t: '    net_pay' },
    { t: 'UQ  (employee_id, y, m)' },
  ], C.amber);
  entity(s, 10.25, 2.1, 2.5, 4.3, 'users', [
    { t: 'PK  user_id' },
    { t: '    username UNIQUE' },
    { t: '    email UNIQUE' },
    { t: '    full_name' },
    { t: '    password_hash' },
    { t: '      (bcrypt)' },
    { t: '    role CHECK' },
    { t: '      (hr/executive/' },
    { t: '       employee)' },
    { t: 'FK  employee_id ->' },
    { t: '      employees (1-1)' },
  ], C.rose);
}

/* ---------- SLIDE 6 : ER V3 MODULES ---------- */
// SLIDE 6: ER V3 MODULES — ตารางโมดูลเสริม v3: ประกาศ ประกวดผลงาน (reviews/review_goals) และรับสมัครงาน
{
  const s = baseSlide('ENTITY DESIGN 3/3', 'เอนทิตี้โมดูลเสริม v3 — HR ครบวงจร', 'ประกาศ • ประกวดผลงาน • รับสมัครงาน (เพิ่ม 5 ตาราง รวมเป็น 12 ตาราง)');
  entity(s, 0.6, 2.1, 2.5, 2.9, 'announcements', [
    { t: 'PK  announcement_id' },
    { t: '    title, body' },
    { t: 'FK  created_by ->' },
    { t: '      users (SET NULL)' },
    { t: '    created_at' },
  ], C.rose);
  entity(s, 3.3, 2.1, 3.1, 3.9, 'reviews', [
    { t: 'PK  review_id' },
    { t: 'FK  employee_id ->' },
    { t: '      employees' },
    { t: '    period_year' },
    { t: '    reviewer_name' },
    { t: '    overall_score' },
    { t: '    strengths /' },
    { t: '      improvements' },
    { t: 'UQ  (employee_id, year)' },
  ], C.violet);
  entity(s, 6.6, 2.1, 2.6, 2.7, 'review_goals', [
    { t: 'PK  goal_id' },
    { t: 'FK  review_id ->' },
    { t: '      reviews (CASCADE)' },
    { t: '    title' },
    { t: '    weight, score' },
  ], C.violet);
  entity(s, 9.4, 2.1, 3.3, 2.7, 'positions', [
    { t: 'PK  position_id' },
    { t: '    title, headcount' },
    { t: '    status (open)' },
    { t: 'FK  department_id ->' },
    { t: '      departments' },
    { t: '      (SET NULL)' },
  ], C.sky);
  entity(s, 9.4, 5.0, 3.3, 2.0, 'applicants', [
    { t: 'PK  applicant_id' },
    { t: 'FK  position_id ->' },
    { t: '      positions (CASCADE)' },
    { t: '    full_name, email' },
    { t: '    status, notes' },
  ], C.green);
  s.addText('reviews 1 ──∞ review_goals (เป้าหมายถ่วงน้ำหนักคะแนน)', { x: 0.6, y: 6.55, w: 6.0, h: 0.35, fontSize: 10.5, color: C.lightGray, fontFace: FONT });
  s.addText('positions 1 ──∞ applicants (ผู้สมัครต่อตำแหน่งที่เปิดรับ)', { x: 0.6, y: 6.9, w: 6.0, h: 0.35, fontSize: 10.5, color: C.lightGray, fontFace: FONT });
}

/* ---------- SLIDE 6 : DDL ---------- */
// SLIDE 6: DDL — ตัวอย่าง DDL script บน pgAdmin + ลำดับไฟล์ migration ทั้ง 5 ไฟล์
{
  const s = baseSlide('DDL — pgAdmin', 'สร้างตารางด้วย DDL Script', 'รันผ่าน pgAdmin Query Tool — 5 ไฟล์ตามลำดับการพัฒนา • มี Prisma schema สะท้อนโครงสร้างเดียวกัน');
  const code = [
    ['-- schema.sql : employees table', C.lightGray],
    ['CREATE TABLE employees (', 'E2E8F0'],
    ['    employee_id   SERIAL PRIMARY KEY,', 'E2E8F0'],
    ['    email         VARCHAR(255) NOT NULL UNIQUE,', 'E2E8F0'],
    ['    department_id INT NOT NULL REFERENCES', '7DD3FC'],
    ['                  departments(department_id)', '7DD3FC'],
    ['                  ON DELETE RESTRICT,', '7DD3FC'],
    ['    salary        NUMERIC(12,2) CHECK (salary >= 0),', 'FBBF24'],
    ['    status        VARCHAR(20) DEFAULT \'active\'', 'FBBF24'],
    ['                  CHECK (status IN (\'active\',', 'FBBF24'],
    ['                  \'inactive\',\'terminated\')),', 'FBBF24'],
    ['    annual_leave_quota INT NOT NULL DEFAULT 10', 'F9A8D4'],
    [');', 'E2E8F0'],
    ['CREATE INDEX idx_emp_dept ON employees(department_id);', 'C084FC'],
  ];
  const runs = code.map((l) => ({ text: l[0] + '\n', options: { color: l[1] } }));
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 2.0, w: 7.4, h: 4.7, fill: { color: C.dark }, rectRadius: 0.1 });
  s.addText(runs, { x: 0.85, y: 2.2, w: 6.95, h: 4.3, fontSize: 10.5, fontFace: MONO, valign: 'top', lineSpacingMultiple: 1.15 });
  const files = [
    ['1. schema.sql', 'departments, employees, leave_requests + indexes', C.indigo],
    ['2. migration_payroll.sql', 'attendance, bonuses, payroll_records', C.sky],
    ['3. migration_auth.sql', 'users + บัญชีทดลอง (bcrypt hash)', C.green],
    ['4. migration_v2.sql', 'เพิ่มคอลัมน์ annual_leave_quota', C.amber],
    ['5. migration_v3.sql', 'announcements, reviews, review_goals, positions, applicants', C.rose],
  ];
  files.forEach((f, i) => card(s, 8.25, 2.0 + i * 0.99, 4.45, 0.88, f[0], f[1], f[2], 9.5));
}

/* ---------- SLIDE 7 : API ---------- */
// SLIDE 7: API — ตารางสรุป REST API endpoints พร้อมสิทธิ์การเข้าถึงของแต่ละบทบาท
{
  const s = baseSlide('BACKEND', 'REST API Endpoints', '39 Endpoints • ทุก endpoint ตรวจสิทธิ์ด้วย JWT (ยกเว้น register/login) • บทบาทพนักงานเห็นเฉพาะข้อมูลของตัวเอง');
  const head = { fill: { color: C.indigo }, color: C.white, bold: true, fontFace: FONT, fontSize: 10.5, valign: 'middle' };
  const rows = [
    [{ text: 'Method', options: head }, { text: 'Endpoint', options: head }, { text: 'รายละเอียด', options: head }, { text: 'สิทธิ์', options: head }],
    ['POST GET', '/api/auth/register · /login · /me', 'สมัครสมาชิก / เข้าสู่ระบบ (JWT) / ข้อมูลปัจจุบัน', 'Public'],
    ['GET POST PUT', '/api/employees · /:id/account', 'รายชื่อ / เพิ่ม / แก้ไข / สร้างบัญชีให้พนักงาน', 'ดู: ตามบทบาท · แก้: HR+Exec'],
    ['GET POST PUT DELETE', '/api/departments', 'จัดการแผนก (ลบไม่ได้ถ้ายังมีพนักงาน)', 'ดู: ทุกคน · แก้: HR+Exec'],
    ['GET POST PATCH', '/api/leaves', 'ใบลา / ยื่นใหม่ / อนุมัติ-ไม่อนุมัติ', 'พนักงานยื่นเองได้ · อนุมัติ: HR+Exec'],
    ['GET POST', '/api/attendance/check-in · /check-out', 'บันทึกเวลาทำงาน + คิด OT อัตโนมัติ', 'HR+Exec'],
    ['GET POST PUT', '/api/payroll · /generate · /bonus', 'Payslip / คำนวณทั้งเดือน (Transaction) / โบนัส', 'พนักงานเห็นของตัวเอง · HR+Exec'],
    ['GET', '/api/stats/dashboard · /executive', 'ข้อมูลกราฟ Dashboard / รายงานเฉพาะผู้บริหาร', 'Executive: ผู้บริหารเท่านั้น'],
    ['GET POST DELETE', '/api/announcements', 'ประกาศบริษัท (ผู้เขียนเชื่อมกับ users)', 'อ่าน: ทุกคน · โพสต์: HR+Exec'],
    ['GET POST PUT DELETE', '/api/reviews', 'ประกวดผลงานรายปี + เป้าหมายถ่วงน้ำหนัก', 'ดู: ตามบทบาท · จัดการ: HR+Exec'],
    ['GET POST PATCH', '/api/recruitment/positions · /applicants', 'ตำแหน่งเปิดรับ / ผู้สมัคร / อัปเดตสถานะ', 'HR+Exec'],
  ];
  const tableRows = rows.map((r, ri) =>
    ri === 0 ? r : r.map((c) => ({ text: c, options: { fontSize: 9.5, color: C.slate, fontFace: FONT, valign: 'middle', fill: { color: ri % 2 ? C.white : 'F8FAFC' } } }))
  );
  s.addTable(tableRows, { x: 0.6, y: 1.95, w: 12.1, colW: [1.9, 4.0, 3.9, 2.3], border: { type: 'solid', pt: 0.5, color: C.border }, rowH: 0.47, margin: 0.05 });
}

/* ---------- SLIDE 8 : SECURITY ---------- */
// SLIDE 8: SECURITY — ขั้นตอนยืนยันตัวตน (bcrypt -> JWT -> middleware) และสิทธิ์ 3 ระดับ
{
  const s = baseSlide('SECURITY & ROLES', 'ระบบสมาชิก + การจำกัดสิทธิ์', 'JWT + bcrypt + Role-based Access Control');
  const flow = [
    ['Login / Register', 'รหัสผ่านเข้ารหัสด้วย bcrypt (10 rounds)', C.indigo],
    ['JWT Token', 'Payload: id + role • หมดอายุ 7 วัน', C.violet],
    ['Middleware', 'requireAuth (401) + requireRole (403)', C.green],
  ];
  flow.forEach((f, i) => {
    const x = 0.9 + i * 4.35;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 2.05, w: 3.4, h: 1.5, fill: { color: C.white }, line: { color: f[2], width: 2 }, rectRadius: 0.1 });
    s.addText(f[0], { x, y: 2.2, w: 3.4, h: 0.4, fontSize: 14, bold: true, color: C.dark, align: 'center', fontFace: FONT });
    s.addText(f[1], { x: x + 0.15, y: 2.6, w: 3.1, h: 0.8, fontSize: 11, color: C.gray, align: 'center', fontFace: FONT });
    if (i < 2) s.addShape(pptx.ShapeType.rightArrow, { x: x + 3.48, y: 2.6, w: 0.78, h: 0.4, fill: { color: 'A5B4FC' } });
  });
  card(s, 0.6, 4.1, 3.9, 2.6, 'HR — ฝ่ายบุคคล', 'จัดการได้ทุกอย่าง: พนักงาน ใบลา เวลาทำงาน เงินเดือน โบนัส รีวิว รับสมัครงาน ประกาศ', C.indigo, 10.5, 'shield');
  card(s, 4.7, 4.1, 3.9, 2.6, 'EXECUTIVE — ผู้บริหาร', 'ใช้งานได้ทุกอย่างเช่นกัน + รายงานเฉพาะผู้บริหาร (Top 5 เงินเดือน, ต้นทุนรายแผนก) — HR เรียกจะได้ 403', C.amber, 10.5, 'award');
  card(s, 8.85, 4.1, 3.85, 2.6, 'EMPLOYEE — พนักงาน', 'HR สร้างบัญชีให้ผ่านระบบ • เห็นเฉพาะข้อมูลของตัวเอง: โปรไฟล์ ยื่นใบลา ดูสลิปเงินเดือน', C.green, 10.5, 'users');
}

/* ---------- SLIDE 9 : PAYROLL ---------- */
// SLIDE 9: PAYROLL — สูตรคำนวณ OT, ประกันสังคม, ภาษีหัก ณ ที่จ่าย และสรุปเงินสุทธิ
{
  const s = baseSlide('PAYROLL ENGINE', 'สูตรคำนวณเงินเดือน (โดยประมาณ)', 'อ้างอิงหลักเกณฑ์ไทย — อยู่ใน backend/src/payroll.ts');
  card(s, 0.6, 2.05, 6.0, 1.55, 'ค่าล่วงเวลา (OT)', 'OT = ชม.OT × (เงินเดือน ÷ 30 ÷ 8) × 1.5\nชม.OT = ชั่วโมงทำงาน − 8 (หักพักเที่ยง 1 ชม.)', C.sky, 12);
  card(s, 6.85, 2.05, 5.85, 1.55, 'ประกันสังคม (SSO)', 'SSO = min(เงินเดือน × 5%, 750 บาท/เดือน)', C.green, 12);
  card(s, 0.6, 3.8, 6.0, 1.85, 'ภาษีหัก ณ ที่จ่าย', 'ขั้นบันได 0–35% จากรายได้ต่อปี (เงินเดือน+OT)\nหักได้: ค่าใช้จ่าย 50% (สูงสุด 100,000) • ค่าลดหย่อนส่วนตัว 60,000 • เบี้ยประกันสังคมรายปี', C.indigo, 12);
  card(s, 6.85, 3.8, 5.85, 1.85, 'ภาษีโบนัส', 'หักครั้งเดียวในเดือนที่จ่าย ที่อัตราขั้นสูง (marginal rate) ของพนักงานแต่ละคน', C.violet, 12);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.9, w: 12.1, h: 0.85, fill: { color: C.dark }, rectRadius: 0.1 });
  s.addText('เงินสุทธิ = (เงินเดือน + ค่า OT + โบนัส) − ประกันสังคม − ภาษีหัก ณ ที่จ่าย', { x: 0.6, y: 5.9, w: 12.1, h: 0.85, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
}

/* ---------- SLIDE 10 : UI ---------- */
// SLIDE 10: UI — จุดเด่นของ Frontend: 2 ภาษา, กราฟ, Employee Portal, a11y, แจ้งเตือน
{
  const s = baseSlide('FRONTEND UI/UX', 'หน้าตาและประสบการณ์ใช้งาน', 'Modern UI — 12 หน้า • แยก App ของ HR/ผู้บริหาร และพนักงาน (Self-service)');
  const items = [
    ['รองรับ 2 ภาษา', 'สลับ ไทย/English ทันทีทุกหน้า (i18next) • วันที่/เงินปรับตาม locale', C.indigo],
    ['Dashboard + กราฟ', 'KPI Cards • Bar/Pie Chart (Recharts) • รายงานเฉพาะผู้บริหาร • ปฏิทินการลา', C.violet],
    ['Employee Portal', 'พนักงานเข้าดูโปรไฟล์ / ใบลาของตัวเอง / สลิปเงินเดือนของตัวเอง', C.sky],
    ['Radix UI + Skeleton', 'Dialog / Select / Tabs เข้าถึงได้ (a11y) • โหลดแบบ skeleton • ปุ่มกันกดซ้ำ', C.green],
    ['แจ้งเตือน', 'กระดิ่งแจ้งเตือนใบลาที่รออนุมัติ • ประกาศบริษัทล่าสุดบนหน้าแรก', C.amber],
    ['อื่นๆ', 'Avatar อัตโนมัติ • ส่งออก CSV (UTF-8 BOM รองรับภาษาไทยใน Excel) • Glassmorphism Sidebar', C.rose],
  ];
  items.forEach((f, i) => {
    const x = 0.6 + (i % 3) * 4.15, y = 2.05 + Math.floor(i / 3) * 2.35;
    card(s, x, y, 3.95, 2.15, f[0], f[1], f[2], 11);
  });
}

/* ---------- SLIDE 11 : SUMMARY ---------- */
// SLIDE 11: SUMMARY — สรุปตัวเลขโปรเจกต์ สิ่งที่ทำได้ บัญชีทดลอง และคำสั่งรันระบบสาธิต
{
  const s = baseSlide('SUMMARY & DEMO', 'สรุป & วิธีเปิดระบบสาธิต');
  const stats = [
    ['12', 'ตารางฐานข้อมูล', C.indigo],
    ['39', 'API Endpoints', C.violet],
    ['3', 'ระดับสิทธิ์ผู้ใช้', C.green],
    ['12', 'หน้าจอ / 2 ภาษา', C.amber],
  ];
  stats.forEach((t, i) => {
    const x = 0.6 + i * 3.12;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.95, w: 2.92, h: 1.0, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.09 });
    s.addText(t[0], { x, y: 2.02, w: 2.92, h: 0.52, fontSize: 26, bold: true, color: t[2], align: 'center', fontFace: FONT });
    s.addText(t[1], { x, y: 2.56, w: 2.92, h: 0.3, fontSize: 10.5, color: C.gray, align: 'center', fontFace: FONT });
  });
  card(s, 0.6, 3.3, 6.3, 3.4, 'สิ่งที่ทำได้จากโปรเจกต์นี้',
    '• ออกแบบ ER Diagram 12 เอนทิตี้ + DDL ใน pgAdmin + Prisma\n' +
    '• REST API 39 endpoints + ระบบสมาชิก JWT + สิทธิ์ 3 ระดับ\n' +
    '• Payroll Engine (SSO / ภาษี / OT / โบนัส)\n' +
    '• โมดูลครบวงจร: ประกวดผลงาน • รับสมัครงาน • ประกาศ • Self-service\n' +
    '• Frontend React + TypeScript 2 ภาษา + กราฟ + UI สวยทันสมัย\n' +
    '• ทดสอบจริงทั้งระบบ (401/403 / Transaction / CASCADE)', C.indigo, 11.5);
  card(s, 7.15, 3.3, 5.55, 1.6, 'บัญชีทดลอง',
    'HR — hr@company.com / hr12345\nผู้บริหาร — exec@company.com / exec12345', C.green, 11.5);
  card(s, 7.15, 5.1, 5.55, 1.6, 'คำสั่งรันระบบ',
    'cd backend  && npm run dev    (port 5000)\ncd frontend && npm run dev    (port 5173)\nเปิด http://localhost:5173', C.amber, 11.5);
}

// บันทึกไฟล์ .pptx ไปที่ root ของโปรเจกต์ แล้วพิมพ์ CREATED: <path> เมื่อสำเร็จ
pptx.writeFile({ fileName: path.join(__dirname, '..', '..', 'HR-System-Presentation.pptx') })
  .then((f) => console.log('CREATED:', f));
