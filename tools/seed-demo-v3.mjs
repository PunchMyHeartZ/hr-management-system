// Seeds demo data for new modules (announcements, reviews, recruitment, self-service).
// Usage: node tools/seed-demo-v3.mjs  (requires backend on localhost:5000)

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

const ANNOUNCEMENTS = [
  {
    title: 'Company Sport Day 2026',
    body: 'Join our annual Sport Day on Friday, Nov 28 at RCA Sports Complex. Free T-shirt and lunch for all participants. Please register with HR by Nov 20.',
  },
  {
    title: 'New Health Insurance Plan',
    body: 'Starting December 2026, the company upgrades the group health insurance to OPD 5,000 THB/year and dental 2,000 THB/year. HR will send details to your email.',
  },
  {
    title: 'Payroll Cut-off Reminder',
    body: 'Monthly payroll cut-off is the 25th. Please make sure overtime and bonus requests are submitted before then.',
  },
];

const REVIEWS = [
  {
    by: 'Somchai Wongpakdi',
    reviewer_name: 'Somsi HR Admin',
    overall_score: 4.5,
    strengths: 'Excellent technical leadership, mentors juniors well, delivers ahead of schedule.',
    improvements: 'Could delegate more of the code review workload.',
    status: 'final',
    goals: [
      { title: 'Reduce production bugs by 30%', weight: 3, score: 4.5 },
      { title: 'Mentor 2 junior engineers to independent delivery', weight: 2, score: 4.0 },
    ],
  },
  {
    by: 'Ploy Kietduriyakul',
    reviewer_name: 'Somchai Wongpakdi',
    overall_score: 4.0,
    strengths: 'Very thorough test plans, caught critical regressions before release.',
    improvements: 'Improve test automation coverage.',
    status: 'final',
    goals: [
      { title: 'Automate 60% of regression suite', weight: 3, score: 3.5 },
      { title: 'Zero escaped defects per release', weight: 2, score: 5.0 },
    ],
  },
  {
    by: 'Malinee Chotirojsiri',
    reviewer_name: 'Somsi HR Admin',
    overall_score: 4.5,
    strengths: 'Accurate monthly closing, led a smooth audit with zero findings.',
    improvements: 'Speed up reimbursement processing time.',
    status: 'draft',
    goals: [
      { title: 'Close monthly books within 3 working days', weight: 3, score: 5.0 },
      { title: 'Digitize reimbursement workflow', weight: 2, score: 3.5 },
    ],
  },
  {
    by: 'Anucha Praphanwong',
    reviewer_name: 'Somchai Wongpakdi',
    overall_score: 3.5,
    strengths: 'Fast learner, great team player.',
    improvements: 'Estimate tasks more accurately; reduce late deliveries.',
    status: 'draft',
    goals: [
      { title: 'Deliver 90% of sprint commitments', weight: 3, score: 3.0 },
      { title: 'Complete AWS certification', weight: 2, score: 4.0 },
    ],
  },
];

const POSITIONS = [
  {
    title: 'Senior Backend Engineer',
    department_id: 1,
    headcount: 2,
    description: 'Design and scale Node.js/PostgreSQL services. 5+ years experience with distributed systems.',
    status: 'open',
    applicants: [
      { full_name: 'Teerapap Jantanasakul', email: 'teerapap.j@mail.com', phone: '0811111111', status: 'interview', notes: 'Strong system design, ex-fintech' },
      { full_name: 'Woranuch Laohaburananont', email: 'woranuch.l@mail.com', phone: '0822222222', status: 'screening', notes: 'Good Node.js background' },
      { full_name: 'Patiparn Chuedee', email: 'patiparn.c@mail.com', phone: '0833333333', status: 'applied', notes: null },
    ],
  },
  {
    title: 'UX/UI Designer',
    department_id: 4,
    headcount: 1,
    description: 'Own product design end-to-end: research, wireframes, design system, usability tests.',
    status: 'open',
    applicants: [
      { full_name: 'Sirikan Manthanachart', email: 'sirikan.m@mail.com', phone: '0844444444', status: 'offer', notes: 'Great portfolio, accepted verbal offer' },
      { full_name: 'Korakot Saranit', email: 'korakot.s@mail.com', phone: '0855555555', status: 'rejected', notes: 'Portfolio not a fit' },
    ],
  },
  {
    title: 'Payroll Specialist',
    department_id: 2,
    headcount: 1,
    description: 'Run monthly payroll, SSO, and withholding tax filings. Thai labor law knowledge required.',
    status: 'open',
    applicants: [
      { full_name: 'Narubet Sornchai', email: 'narubet.s@mail.com', phone: '0866666666', status: 'hired', notes: 'Starts Dec 1' },
      { full_name: 'Arisara Pumrin', email: 'arisara.p@mail.com', phone: '0877777777', status: 'interview', notes: 'Pending background check' },
    ],
  },
  {
    title: 'Data Analyst (Intern)',
    department_id: 3,
    headcount: 3,
    description: 'Support finance analytics dashboards. Students welcome.',
    status: 'closed',
    applicants: [
      { full_name: 'Chayakorn Phromma', email: 'chayakorn.p@mail.com', phone: '0888888888', status: 'rejected', notes: 'Position closed' },
    ],
  },
];

const EMPLOYEE_ACCOUNT = { by: 'Somchai Wongpakdi', username: 'somchai', password: 'somchai123' };

async function main() {
  const login = await call('POST', '/auth/login', { email: 'hr@company.com', password: 'hr12345' });
  token = login.token;
  console.log(`Logged in as ${login.user.full_name}`);

  const employees = await call('GET', '/employees');
  const byName = new Map(employees.map((e) => [`${e.first_name} ${e.last_name}`, e]));
  const departments = await call('GET', '/departments');

  const existingAnnouncements = await call('GET', '/announcements');
  if (existingAnnouncements.length === 0) {
    for (const a of ANNOUNCEMENTS) {
      await call('POST', '/announcements', a);
    }
    console.log(`announcements: created ${ANNOUNCEMENTS.length}`);
  } else {
    console.log(`announcements: skip (${existingAnnouncements.length} exist)`);
  }

  const existingReviews = await call('GET', '/reviews');
  if (existingReviews.length === 0) {
    for (const r of REVIEWS) {
      const emp = byName.get(r.by);
      if (!emp) continue;
      await call('POST', '/reviews', {
        employee_id: emp.employee_id,
        period_year: 2026,
        reviewer_name: r.reviewer_name,
        overall_score: r.overall_score,
        strengths: r.strengths,
        improvements: r.improvements,
        status: r.status,
        goals: r.goals,
      });
      console.log(`review: ${r.by} ${r.overall_score} [${r.status}]`);
    }
  } else {
    console.log(`reviews: skip (${existingReviews.length} exist)`);
  }

  const existingPositions = await call('GET', '/recruitment/positions');
  if (existingPositions.length === 0) {
    for (const p of POSITIONS) {
      const created = await call('POST', '/recruitment/positions', {
        title: p.title,
        department_id: p.department_id,
        headcount: p.headcount,
        description: p.description,
        status: p.status,
      });
      for (const a of p.applicants) {
        await call('POST', '/recruitment/applicants', {
          position_id: created.position_id,
          full_name: a.full_name,
          email: a.email,
          phone: a.phone,
          notes: a.notes,
        }).then((app) => {
          if (a.status !== 'applied') {
            return call('PATCH', `/recruitment/applicants/${app.applicant_id}/status`, { status: a.status });
          }
        });
      }
      console.log(`position: ${p.title} + ${p.applicants.length} applicants`);
    }
  } else {
    console.log(`positions: skip (${existingPositions.length} exist)`);
  }

  const target = byName.get(EMPLOYEE_ACCOUNT.by);
  if (target) {
    try {
      await call('POST', `/employees/${target.employee_id}/account`, {
        username: EMPLOYEE_ACCOUNT.username,
        password: EMPLOYEE_ACCOUNT.password,
      });
      console.log(`employee account: ${EMPLOYEE_ACCOUNT.by} -> ${EMPLOYEE_ACCOUNT.username} / ${EMPLOYEE_ACCOUNT.password}`);
    } catch (err) {
      if (err.status === 409) console.log('employee account: skip (exists)');
      else throw err;
    }
  }

  console.log('Departments:', departments.map((d) => d.department_name).join(', '));
  console.log('Seed v3 complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
