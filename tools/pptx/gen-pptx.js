// Generates HR-System-Presentation.pptx (modern Thai deck, 16:9)
const PptxGenJS = require('pptxgenjs');

const C = {
  indigo: '4F46E5', violet: '7C3AED', dark: '0F172A', slate: '334155',
  gray: '64748B', light: 'F5F6FA', white: 'FFFFFF', border: 'E2E8F0',
  amber: 'B45309', green: '15803D', rose: 'BE123C', sky: '0EA5E9',
  indigoSoft: 'EEF2FF', indigoText: '3730A3', lightGray: '94A3B8',
};
const FONT = 'Leelawadee UI';
const MONO = 'Consolas';

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
pptx.layout = 'WIDE';
pptx.author = 'HR System Project';
pptx.title = 'HR Management System';

let pageNo = 0;

function baseSlide(kicker, title, sub) {
  const s = pptx.addSlide();
  s.background = { color: C.light };
  const kw = Math.max(1.6, kicker.length * 0.115);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 0.42, w: kw, h: 0.34, fill: { color: C.indigo }, rectRadius: 0.17 });
  s.addText(kicker, { x: 0.6, y: 0.42, w: kw, h: 0.34, fontSize: 10.5, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
  s.addText(title, { x: 0.6, y: 0.86, w: 12.1, h: 0.62, fontSize: 27, bold: true, color: C.dark, fontFace: FONT });
  if (sub) s.addText(sub, { x: 0.6, y: 1.46, w: 12.1, h: 0.38, fontSize: 13, color: C.gray, fontFace: FONT });
  pageNo += 1;
  if (pageNo > 1) s.addText(String(pageNo), { x: 12.65, y: 7.08, w: 0.5, h: 0.3, fontSize: 10, color: C.lightGray, align: 'right', fontFace: FONT });
  return s;
}

function card(s, x, y, w, h, title, body, accent = C.indigo, bodySize = 11) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.white }, line: { color: C.border, width: 1 }, rectRadius: 0.09 });
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: accent } });
  s.addText(title, { x: x + 0.2, y: y + 0.1, w: w - 0.32, h: 0.34, fontSize: 13, bold: true, color: C.dark, fontFace: FONT });
  s.addText(body, { x: x + 0.2, y: y + 0.44, w: w - 0.34, h: h - 0.56, fontSize: bodySize, color: C.gray, fontFace: FONT, valign: 'top' });
}

function chip(s, x, y, text, fg, bg, w = 1.45) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.32, fill: { color: bg }, rectRadius: 0.16 });
  s.addText(text, { x, y, w, h: 0.32, fontSize: 10, bold: true, color: fg, align: 'center', valign: 'middle', fontFace: FONT });
}

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
{
  const s = pptx.addSlide();
  s.background = { color: C.dark };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.indigo } });
  s.addShape(pptx.ShapeType.rect, { x: 6.67, y: 0, w: 6.66, h: 0.12, fill: { color: C.violet } });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 1.55, w: 1.5, h: 0.4, fill: { color: C.indigo }, rectRadius: 0.2 });
  s.addText('PROJECT PRESENTATION', { x: 0.9, y: 1.55, w: 1.5, h: 0.4, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
  s.addText('ระบบบริหารทรัพยากรบุคคล', { x: 0.9, y: 2.15, w: 11.5, h: 0.95, fontSize: 44, bold: true, color: C.white, fontFace: FONT });
  s.addText('HR Management System', { x: 0.9, y: 3.1, w: 11.5, h: 0.6, fontSize: 26, bold: true, color: 'A5B4FC', fontFace: FONT });
  s.addText('พนักงาน • การลา • เวลาทำงาน/OT • เงินเดือน/ประกันสังคม/ภาษี • สิทธิ์ 2 ระดับ • รองรับ 2 ภาษา', { x: 0.9, y: 3.85, w: 11.5, h: 0.4, fontSize: 13, color: 'CBD5E1', fontFace: FONT });
  const chips = [
    ['Vite + React', C.indigoText, C.indigoSoft], ['Tailwind CSS', C.indigoText, C.indigoSoft],
    ['Radix UI', C.indigoText, C.indigoSoft], ['Express', C.green, 'DCFCE7'],
    ['JWT + bcrypt', C.green, 'DCFCE7'], ['PostgreSQL 18', C.amber, 'FEF3C7'],
    ['pgAdmin', C.amber, 'FEF3C7'], ['i18next', C.rose, 'FFE4E6'], ['Recharts', C.rose, 'FFE4E6'],
  ];
  chips.forEach((c, i) => chip(s, 0.9 + (i % 5) * 1.62, 4.6 + Math.floor(i / 5) * 0.45, c[0], c[1], c[2], 1.5));
  pageNo += 1;
}

/* ---------- SLIDE 2 : FEATURES ---------- */
{
  const s = baseSlide('OVERVIEW', 'ฟีเจอร์หลักของระบบ', 'พัฒนาครบทั้ง Frontend, Backend และ Database');
  const feats = [
    ['จัดการพนักงาน', 'เพิ่ม / แก้ไข / ค้นหา / กรองแผนก • สถานะการทำงาน • สิทธิ์วันลาคงเหลือ (โควต้า − วันที่ใช้)', C.indigo],
    ['การลา (Leave)', 'ยื่นใบลา 4 ประเภท (พักร้อน/ป่วย/กิจ/ไม่รับค่าจ้าง) • อนุมัติ/ไม่อนุมัติ • นับวันอัตโนมัติ', C.violet],
    ['เวลาทำงาน + OT', 'บันทึกเข้า-ออกงาน • คิด OT อัตโนมัติ = ชั่วโมงที่เกิน 8 ชม. (หักพักเที่ยง 1 ชม.)', C.sky],
    ['Payroll Engine', 'ประกันสังคม 5% (สูงสุด 750) • ภาษีขั้นบันได 0-35% • โบนัสหักภาษีอัตราขั้นสูง • ส่งออก CSV', C.green],
    ['สิทธิ์การใช้งาน', 'ระบบสมาชิก + Login (JWT) • ระดับ HR และผู้บริหาร • รายงานลับเฉพาะผู้บริหาร', C.amber],
    ['Dashboard + กราฟ', 'KPI ภาพรวม • กราฟการลา / เงินจ่ายรายเดือน / แยกแผนก • ภาษาไทย-อังกฤษ', C.rose],
  ];
  feats.forEach((f, i) => {
    const x = 0.6 + (i % 3) * 4.15, y = 2.05 + Math.floor(i / 3) * 2.35;
    card(s, x, y, 3.95, 2.15, f[0], f[1], f[2], 11);
  });
}

/* ---------- SLIDE 3 : ARCHITECTURE ---------- */
{
  const s = baseSlide('ARCHITECTURE', 'สถาปัตยกรรมระบบ', '3-Tier Architecture — แยกชั้นชัดเจน');
  const tiers = [
    ['Frontend', 'Vite + React 18', 'Tailwind CSS v4 • Radix UI', 'i18next (TH/EN) • Recharts', C.indigo],
    ['Backend REST API', 'Node.js + Express', 'JWT Auth Middleware', 'Role-based Access (HR/Exec)', C.green],
    ['PostgreSQL 18', '7 Tables + Constraints', 'pg (node-postgres) Pool', 'จัดการผ่าน pgAdmin', C.amber],
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
  entity(s, 10.25, 2.1, 2.5, 3.9, 'users', [
    { t: 'PK  user_id' },
    { t: '    username UNIQUE' },
    { t: '    email UNIQUE' },
    { t: '    password_hash' },
    { t: '      (bcrypt)' },
    { t: '    role CHECK' },
    { t: '      (hr/executive)' },
  ], C.rose);
}

/* ---------- SLIDE 6 : DDL ---------- */
{
  const s = baseSlide('DDL — pgAdmin', 'สร้างตารางด้วย DDL Script', 'รันผ่าน pgAdmin Query Tool — 4 ไฟล์ตามลำดับการพัฒนา (Migrations)');
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
  ];
  files.forEach((f, i) => card(s, 8.25, 2.0 + i * 1.22, 4.45, 1.08, f[0], f[1], f[2], 10.5));
}

/* ---------- SLIDE 7 : API ---------- */
{
  const s = baseSlide('BACKEND', 'REST API Endpoints', 'ทุก endpoint ตรวจสิทธิ์ด้วย JWT • การแก้ไขข้อมูลต้องเป็น HR หรือผู้บริหาร');
  const head = { fill: { color: C.indigo }, color: C.white, bold: true, fontFace: FONT, fontSize: 11, valign: 'middle' };
  const rows = [
    [{ text: 'Method', options: head }, { text: 'Endpoint', options: head }, { text: 'รายละเอียด', options: head }, { text: 'สิทธิ์', options: head }],
    ['POST/GET', '/api/auth/register · /login · /me', 'สมัครสมาชิก / เข้าสู่ระบบ (JWT) / ข้อมูลปัจจุบัน', 'Public'],
    ['GET POST PUT', '/api/employees', 'รายชื่อ (JOIN ชื่อแผนก) / เพิ่ม / แก้ไขพนักงาน', 'ดู: ทุกคน · แก้: HR+Exec'],
    ['GET POST PATCH', '/api/leaves', 'ใบลา / ยื่นใหม่ / อนุมัติ-ไม่อนุมัติ', 'ดู: ทุกคน · อนุมัติ: HR+Exec'],
    ['GET POST', '/api/attendance/check-in · /check-out', 'บันทึกเวลาทำงาน + คิด OT อัตโนมัติ', 'HR+Exec'],
    ['GET POST PUT', '/api/payroll · /generate · /bonus', 'Payslip / คำนวณทั้งเดือน (Transaction) / โบนัส', 'ดู: ทุกคน · คำนวณ: HR+Exec'],
    ['GET', '/api/stats/dashboard · /executive', 'ข้อมูลกราฟ Dashboard / รายงานลับผู้บริหาร', 'Dashboard: ทุกคน · Executive: ผู้บริหารเท่านั้น'],
  ];
  const tableRows = rows.map((r, ri) =>
    ri === 0 ? r : r.map((c) => ({ text: c, options: { fontSize: 10.5, color: C.slate, fontFace: FONT, valign: 'middle', fill: { color: ri % 2 ? C.white : 'F8FAFC' } } }))
  );
  s.addTable(tableRows, { x: 0.6, y: 2.0, w: 12.1, colW: [1.7, 4.1, 4.0, 2.3], border: { type: 'solid', pt: 0.5, color: C.border }, rowH: 0.62, margin: 0.06 });
}

/* ---------- SLIDE 8 : SECURITY ---------- */
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
  card(s, 0.9, 4.1, 5.9, 2.6, 'HR — ฝ่ายบุคคล', 'จัดการได้ทุกอย่าง: พนักงาน ใบลา เวลาทำงาน เงินเดือน โบนัส • เห็น Dashboard ภาพรวม', C.indigo, 12);
  card(s, 7.0, 4.1, 5.9, 2.6, 'EXECUTIVE — ผู้บริหาร', 'ใช้งานได้ทุกอย่างเช่นกัน + รายงานลับเฉพาะผู้บริหาร (Top 5 เงินเดือน, ต้นทุนรายแผนก, ประมาณการต่อปี) — HR เรียก API นี้จะได้ 403', C.amber, 12);
}

/* ---------- SLIDE 9 : PAYROLL ---------- */
{
  const s = baseSlide('PAYROLL ENGINE', 'สูตรคำนวณเงินเดือน (โดยประมาณ)', 'อ้างอิงหลักเกณฑ์ไทย — อยู่ใน backend/src/payroll.js');
  card(s, 0.6, 2.05, 6.0, 1.55, 'ค่าล่วงเวลา (OT)', 'OT = ชม.OT × (เงินเดือน ÷ 30 ÷ 8) × 1.5\nชม.OT = ชั่วโมงทำงาน − 8 (หักพักเที่ยง 1 ชม.)', C.sky, 12);
  card(s, 6.85, 2.05, 5.85, 1.55, 'ประกันสังคม (SSO)', 'SSO = min(เงินเดือน × 5%, 750 บาท/เดือน)', C.green, 12);
  card(s, 0.6, 3.8, 6.0, 1.85, 'ภาษีหัก ณ ที่จ่าย', 'ขั้นบันได 0–35% จากรายได้ต่อปี (เงินเดือน+OT)\nหักได้: ค่าใช้จ่าย 50% (สูงสุด 100,000) • ค่าลดหย่อนส่วนตัว 60,000 • เบี้ยประกันสังคมรายปี', C.indigo, 12);
  card(s, 6.85, 3.8, 5.85, 1.85, 'ภาษีโบนัส', 'หักครั้งเดียวในเดือนที่จ่าย ที่อัตราขั้นสูง (marginal rate) ของพนักงานแต่ละคน', C.violet, 12);
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.9, w: 12.1, h: 0.85, fill: { color: C.dark }, rectRadius: 0.1 });
  s.addText('เงินสุทธิ = (เงินเดือน + ค่า OT + โบนัส) − ประกันสังคม − ภาษีหัก ณ ที่จ่าย', { x: 0.6, y: 5.9, w: 12.1, h: 0.85, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });
}

/* ---------- SLIDE 10 : UI ---------- */
{
  const s = baseSlide('FRONTEND UI/UX', 'หน้าตาและประสบการณ์ใช้งาน', 'Modern UI — ใช้งานได้ทั้งเดสก์ท็อปและมือถือ');
  const items = [
    ['รองรับ 2 ภาษา', 'สลับ ไทย/English ทันทีทุกหน้า (i18next) • วันที่/เงินปรับตาม locale', C.indigo],
    ['Dashboard + กราฟ', 'KPI Cards • Bar/Pie/Stacked Chart (Recharts) • รายงานเฉพาะผู้บริหาร', C.violet],
    ['Radix UI Components', 'Dialog (เพิ่ม/แก้ไข) • Select • Tabs — เข้าถึงได้ (accessibility)', C.sky],
    ['Skeleton Loading', 'โหลดข้อมูลแบบ skeleton ไม่กระโดด layout • ปุ่มทุกปุ่มกันกดซ้ำ + spinner', C.green],
    ['รูปโปรไฟล์อัตโนมัติ', 'Mock-up avatar ตายตัวต่อรหัสพนักงาน • fallback เป็นตัวอักษรย่อ', C.amber],
    ['ส่งออก CSV', 'ดาวน์โหลด payslip เปิดใน Excel ได้ (ฝัง BOM รองรับภาษาไทย)', C.rose],
  ];
  items.forEach((f, i) => {
    const x = 0.6 + (i % 3) * 4.15, y = 2.05 + Math.floor(i / 3) * 2.35;
    card(s, x, y, 3.95, 2.15, f[0], f[1], f[2], 11);
  });
}

/* ---------- SLIDE 11 : SUMMARY ---------- */
{
  const s = baseSlide('SUMMARY & DEMO', 'สรุป & วิธีเปิดระบบสาธิต');
  card(s, 0.6, 2.0, 6.3, 4.7, 'สิ่งที่ทำได้จากโปรเจกต์นี้',
    '• ออกแบบ ER Diagram 7 เอนทิตี้ + DDL ใน pgAdmin\n' +
    '• REST API ครบ + ระบบสมาชิก JWT + สิทธิ์ 2 ระดับ\n' +
    '• Payroll Engine (SSO / ภาษี / OT / โบนัส)\n' +
    '• Frontend React 2 ภาษา + กราฟ + UI สวยทันสมัย\n' +
    '• ทดสอบจริงทั้งระบบ (401/403 / Transaction / CASCADE)', C.indigo, 13);
  card(s, 7.15, 2.0, 5.55, 2.2, 'บัญชีทดลอง',
    'HR — hr@company.com / hr12345\nผู้บริหาร — exec@company.com / exec12345', C.green, 13);
  card(s, 7.15, 4.5, 5.55, 2.2, 'คำสั่งรันระบบ',
    'cd backend  && npm run dev    (port 5000)\ncd frontend && npm run dev    (port 5173)\nเปิด http://localhost:5173', C.amber, 13);
}

pptx.writeFile({ fileName: 'C:/Users/Darro/hr-management-system/HR-System-Presentation.pptx' })
  .then((f) => console.log('CREATED:', f));
