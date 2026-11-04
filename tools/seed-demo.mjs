// Seeds demo data through the running HR API (no direct DB access needed).
// Usage: node tools/seed-demo.mjs  (requires backend on localhost:5000)

const API = process.env.SEED_API_URL || 'http://localhost:5000/api';
let token = '';

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${method} ${path} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const EMPLOYEES = [
  { first_name: 'Somchai', last_name: 'Wongpakdi', department_id: 1, position: 'Senior Software Engineer', salary: 85000, hire_date: '2021-03-15', annual_leave_quota: 12 },
  { first_name: 'Anucha', last_name: 'Praphanwong', department_id: 1, position: 'Software Engineer', salary: 55000, hire_date: '2022-07-01', annual_leave_quota: 10 },
  { first_name: 'Kanin', last_name: 'Rattanaphan', department_id: 1, position: 'Software Engineer', salary: 52000, hire_date: '2023-02-13', annual_leave_quota: 10 },
  { first_name: 'Ploy', last_name: 'Kietduriyakul', department_id: 1, position: 'QA Engineer', salary: 48000, hire_date: '2022-11-01', annual_leave_quota: 10 },
  { first_name: 'Nattapong', last_name: 'Sirichoo', department_id: 1, position: 'DevOps Engineer', salary: 72000, hire_date: '2021-09-20', annual_leave_quota: 12 },
  { first_name: 'Chayanit', last_name: 'Buakhiew', department_id: 1, position: 'Frontend Developer', salary: 50000, hire_date: '2024-01-08', annual_leave_quota: 10, final_status: 'inactive' },
  { first_name: 'Malinee', last_name: 'Chotirojsiri', department_id: 3, position: 'Finance Manager', salary: 90000, hire_date: '2019-05-02', annual_leave_quota: 15 },
  { first_name: 'Ekkachai', last_name: 'Srihansa', department_id: 3, position: 'Accountant', salary: 45000, hire_date: '2020-08-17', annual_leave_quota: 10 },
  { first_name: 'Rutchanin', last_name: 'Khongmalai', department_id: 3, position: 'Junior Accountant', salary: 32000, hire_date: '2024-06-03', annual_leave_quota: 10 },
  { first_name: 'Pimpawan', last_name: 'Chaisurin', department_id: 4, position: 'Marketing Manager', salary: 80000, hire_date: '2020-02-10', annual_leave_quota: 15 },
  { first_name: 'Thanwa', last_name: 'Phuchada', department_id: 4, position: 'Content Strategist', salary: 42000, hire_date: '2023-04-24', annual_leave_quota: 10 },
  { first_name: 'Nichada', last_name: 'Amornchat', department_id: 4, position: 'Graphic Designer', salary: 38000, hire_date: '2023-10-16', annual_leave_quota: 10, final_status: 'terminated' },
  { first_name: 'Kanyarat', last_name: 'Sudsanguan', department_id: 2, position: 'HR Specialist', salary: 40000, hire_date: '2022-05-09', annual_leave_quota: 10 },
];

const LEAVES = [
  { by: 'Warawut Yusanong', leave_type: 'annual', start_date: '2026-08-10', end_date: '2026-08-12', reason: 'Family trip', status: 'approved' },
  { by: 'Pimpawan Chaisurin', leave_type: 'personal', start_date: '2026-08-21', end_date: '2026-08-21', reason: 'Personal errand', status: 'approved' },
  { by: 'Somchai Wongpakdi', leave_type: 'sick', start_date: '2026-09-03', end_date: '2026-09-04', reason: 'Flu', status: 'approved' },
  { by: 'Anucha Praphanwong', leave_type: 'annual', start_date: '2026-09-16', end_date: '2026-09-18', reason: 'Vacation', status: 'pending' },
  { by: 'Ploy Kietduriyakul', leave_type: 'personal', start_date: '2026-10-07', end_date: '2026-10-07', reason: null, status: 'approved' },
  { by: 'Nattapong Sirichoo', leave_type: 'annual', start_date: '2026-10-20', end_date: '2026-10-22', reason: 'Wedding attendance', status: 'rejected' },
  { by: 'Kanin Rattanaphan', leave_type: 'annual', start_date: '2026-11-24', end_date: '2026-11-28', reason: 'Year-end vacation', status: 'approved' },
  { by: 'Malinee Chotirojsiri', leave_type: 'annual', start_date: '2026-11-09', end_date: '2026-11-11', reason: 'Family matters', status: 'pending' },
  { by: 'Ekkachai Srihansa', leave_type: 'sick', start_date: '2026-11-02', end_date: '2026-11-03', reason: 'Doctor visit', status: 'pending' },
  { by: 'Bundit Butsrimuang', leave_type: 'unpaid', start_date: '2026-12-14', end_date: '2026-12-15', reason: 'Overseas trip', status: 'pending' },
];

const BONUSES_2026 = {
  'Somchai Wongpakdi': 85000,
  'Malinee Chotirojsiri': 90000,
  'Pimpawan Chaisurin': 80000,
  'Nattapong Sirichoo': 50000,
  'Ploy Kietduriyakul': 24000,
};

const PAYROLL_MONTHS = [
  { year: 2026, month: 8 },
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
  { year: 2026, month: 11 },
];

const CLOCK_TODAY = ['Somchai Wongpakdi', 'Ploy Kietduriyakul', 'Ekkachai Srihansa'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const login = await call('POST', '/auth/login', { email: 'hr@company.com', password: 'hr12345' });
  token = login.token;
  console.log(`Logged in as ${login.user.full_name} (${login.user.role})`);

  const existing = await call('GET', '/employees');
  const byName = new Map(existing.map((e) => [`${e.first_name} ${e.last_name}`, e]));

  for (const e of EMPLOYEES) {
    const fullName = `${e.first_name} ${e.last_name}`;
    if (byName.has(fullName)) {
      console.log(`skip employee (exists): ${fullName}`);
      continue;
    }
    const payload = {
      ...e,
      email: `${e.first_name.toLowerCase()}.${e.last_name.toLowerCase()}@company.com`,
      phone: `08${String(10000000 + Math.floor(Math.random() * 89999999)).slice(0, 9)}`,
      status: 'active',
    };
    delete payload.final_status;
    try {
      const created = await call('POST', '/employees', payload);
      byName.set(fullName, created);
      if (e.final_status) {
        await call('PUT', `/employees/${created.employee_id}`, { ...payload, status: e.final_status });
        console.log(`created employee: ${fullName} [${e.final_status}]`);
      } else {
        console.log(`created employee: ${fullName} (#${created.employee_id})`);
      }
    } catch (err) {
      if (err.status === 409) console.log(`skip employee (conflict): ${fullName}`);
      else throw err;
    }
  }

  for (const l of LEAVES) {
    const emp = byName.get(l.by);
    if (!emp) {
      console.log(`skip leave (unknown employee): ${l.by}`);
      continue;
    }
    const created = await call('POST', '/leaves', {
      employee_id: emp.employee_id,
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      reason: l.reason,
    });
    if (l.status !== 'pending') {
      await call('PATCH', `/leaves/${created.leave_id}/status`, { status: l.status });
    }
    console.log(`leave: ${l.by} ${l.leave_type} ${l.start_date} -> ${l.status}`);
  }

  for (const [name, amount] of Object.entries(BONUSES_2026)) {
    const emp = byName.get(name);
    if (!emp) continue;
    await call('PUT', '/payroll/bonus', { employee_id: emp.employee_id, bonus_year: 2026, amount });
    console.log(`bonus 2026: ${name} = ${amount}`);
  }

  for (const p of PAYROLL_MONTHS) {
    const rows = await call('POST', '/payroll/generate', p);
    console.log(`payroll ${p.year}-${String(p.month).padStart(2, '0')}: ${rows.length} payslips`);
  }

  for (const name of CLOCK_TODAY) {
    const emp = byName.get(name);
    if (!emp) continue;
    try {
      await call('POST', '/attendance/check-in', { employee_id: emp.employee_id });
      await sleep(2000);
      await call('POST', '/attendance/check-out', { employee_id: emp.employee_id });
      console.log(`attendance today: ${name} (in + out)`);
    } catch (err) {
      console.log(`attendance skipped for ${name}: ${err.message}`);
    }
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
