// ============================================================
// บริการสถิติ — ข้อมูลสำหรับ Dashboard และรายงานลับผู้บริหาร
// ทุก query รันพร้อมกันด้วย Promise.all (เร็วกว่ารอเรียงทีละตัว)
// ตัวเลขจาก SQL เป็น string (bigint/numeric) จึงแปลง Number() ก่อนส่งออก
// ============================================================
import { pool } from '../db';

interface CountRow {
  total: string;
  active: string;
}

interface PendingRow {
  n: string;
}

interface LeaveByMonthRow {
  month: string;
  count: string;
  days: string;
}

interface LeaveByTypeRow {
  type: string;
  count: string;
  days: string;
}

interface PayrollByMonthRow {
  ym: number;
  month: string;
  gross: string;
  net: string;
  sso: string;
  tax: string;
}

interface CostMonthRow {
  month: string;
  gross: string;
  net: string;
  sso: string;
  tax: string;
}

interface LatestPayRow extends CostMonthRow {
  ot_hours: string;
}

interface DeptPayrollRow {
  department: string;
  employees: string;
  net: string;
}

interface DeptSalaryRow {
  department: string;
  active_employees: string;
  avg_salary: string | null;
}

interface TopEarnerRow {
  id: number;
  name: string;
  position: string;
  department: string;
  salary: string;
}

interface HeadcountRow {
  total: string;
  active: string;
  avg_salary: string | null;
}

export interface DashboardStats {
  employeeCount: number;
  activeEmployees: number;
  pendingLeaves: number;
  leavesByMonth: { month: string; count: number; days: number }[];
  leavesByType: { type: string; count: number; days: number }[];
  payrollByMonth: { month: string; gross: number; net: number; sso: number; tax: number }[];
  latestPay: { month: string; gross: number; net: number; sso: number; tax: number; ot_hours: number } | null;
  payrollByDepartment: { department: string; employees: number; net: number }[];
}

/** ข้อมูลหน้า Dashboard: นับพนักงาน, ใบลารออนุมัติ, กราฟการลา/เงินจ่ายรายเดือน แยกแผนก */
export async function getDashboardStats(): Promise<DashboardStats> {
  // 7 query ขนาน: จำนวนพนักงาน / ใบลา pending / ลาแยกเดือน / ลาแยกประเภท /
  // payroll แยกเดือน / payroll เดือนล่าสุด / ค่าจ่ายแยกแผนก
  const [empCounts, pending, byMonth, byType, payrollMonths, latest, byDept] = await Promise.all([
    pool.query<CountRow>(
      "SELECT count(*) AS total, count(*) FILTER (WHERE status = 'active') AS active FROM employees"
    ),
    pool.query<PendingRow>("SELECT count(*) AS n FROM leave_requests WHERE status = 'pending'"),
    pool.query<LeaveByMonthRow>(`
      SELECT to_char(date_trunc('month', start_date), 'YYYY-MM') AS month,
             count(*) AS count,
             COALESCE(sum(end_date - start_date + 1), 0) AS days
      FROM leave_requests
      WHERE start_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
        AND start_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '7 months'
      GROUP BY 1 ORDER BY 1`),
    pool.query<LeaveByTypeRow>(`
      SELECT leave_type AS type,
             count(*) AS count,
             COALESCE(sum(end_date - start_date + 1), 0) AS days
      FROM leave_requests GROUP BY 1 ORDER BY 2 DESC`),
    pool.query<PayrollByMonthRow>(`
      SELECT pay_period_year * 100 + pay_period_month AS ym,
             to_char(make_date(pay_period_year, pay_period_month, 1), 'YYYY-MM') AS month,
             sum(base_salary + ot_pay + bonus) AS gross,
             sum(net_pay) AS net,
             sum(sso) AS sso,
             sum(tax) AS tax
      FROM payroll_records GROUP BY 1, 2 ORDER BY 1`),
    pool.query<LatestPayRow>(`
      SELECT to_char(make_date(pay_period_year, pay_period_month, 1), 'YYYY-MM') AS month,
             sum(base_salary + ot_pay + bonus) AS gross,
             sum(net_pay) AS net,
             sum(sso) AS sso,
             sum(tax) AS tax,
             sum(ot_hours) AS ot_hours
      FROM payroll_records
      WHERE (pay_period_year * 12 + pay_period_month) =
            (SELECT max(pay_period_year * 12 + pay_period_month) FROM payroll_records)
      GROUP BY 1`),
    pool.query<DeptPayrollRow>(`
      SELECT d.department_name AS department,
             count(*) AS employees,
             sum(p.net_pay) AS net
      FROM payroll_records p
      JOIN employees e ON e.employee_id = p.employee_id
      JOIN departments d ON d.department_id = e.department_id
      WHERE (p.pay_period_year * 12 + p.pay_period_month) =
            (SELECT max(pay_period_year * 12 + pay_period_month) FROM payroll_records)
      GROUP BY 1 ORDER BY net DESC`),
  ]);

  const lp = latest.rows[0];
  return {
    employeeCount: Number(empCounts.rows[0].total),
    activeEmployees: Number(empCounts.rows[0].active),
    pendingLeaves: Number(pending.rows[0].n),
    leavesByMonth: byMonth.rows.map((r) => ({
      month: r.month,
      count: Number(r.count),
      days: Number(r.days),
    })),
    leavesByType: byType.rows.map((r) => ({
      type: r.type,
      count: Number(r.count),
      days: Number(r.days),
    })),
    payrollByMonth: payrollMonths.rows.map((r) => ({
      month: r.month,
      gross: Number(r.gross),
      net: Number(r.net),
      sso: Number(r.sso),
      tax: Number(r.tax),
    })),
    latestPay: lp
      ? {
          month: lp.month,
          gross: Number(lp.gross),
          net: Number(lp.net),
          sso: Number(lp.sso),
          tax: Number(lp.tax),
          ot_hours: Number(lp.ot_hours),
        }
      : null,
    payrollByDepartment: byDept.rows.map((r) => ({
      department: r.department,
      employees: Number(r.employees),
      net: Number(r.net),
    })),
  };
}

/** งวดเดือนที่รายงานผู้บริหารสนใจ (เลือกได้ / ไม่เลือก = เดือนล่าสุดที่มี payroll) */
export interface ExecutivePeriod {
  year: number;
  month: number;
}

export interface ExecutiveStats {
  period: ExecutivePeriod | null;
  latestCost: { month: string; gross: number; net: number; sso: number; tax: number } | null;
  costTrend: { month: string; gross: number; net: number }[];
  byDepartment: { department: string; activeEmployees: number; avgSalary: number | null }[];
  departmentHealth: {
    department: string;
    activeEmployees: number;
    leaveDaysPerEmployee: number | null;
    lateRate: number | null;
    otRatio: number | null;
  }[];
  workforce: {
    hiredThisYear: number;
    terminated: number;
    retentionRate: number;
    openPositions: number;
    openHeadcount: number;
  };
  applicantsByStage: { status: string; count: number }[];
  salarySpread: { department: string; min: number; median: number; max: number }[];
  topEarners: { id: number; name: string; position: string; department: string; salary: number }[];
  headcount: { total: number; active: number; avgSalary: number | null };
}

interface PayrollTrendRow {
  month: string;
  ym: number;
  gross: string;
  net: string;
  sso: string;
  tax: string;
}

/** หางวด payroll ล่าสุดจาก DB — ไม่มีข้อมูล payroll เลยคืน null */
async function resolvePeriod(requested?: ExecutivePeriod): Promise<ExecutivePeriod | null> {
  if (requested) return requested;
  const { rows } = await pool.query<{ pay_period_year: number; pay_period_month: number }>(
    'SELECT pay_period_year, pay_period_month FROM payroll_records ORDER BY pay_period_year DESC, pay_period_month DESC LIMIT 1'
  );
  if (rows.length === 0) return null;
  return { year: rows[0].pay_period_year, month: rows[0].pay_period_month };
}

/** ต้นทุนงวดที่เลือก (latestCost) + แนวโน้มย้อนหลัง 12 เดือน (costTrend) จาก payroll_records */
async function queryCostStats(period: ExecutivePeriod): Promise<Pick<ExecutiveStats, 'latestCost' | 'costTrend'>> {
  const endYm = period.year * 12 + period.month;
  const { rows } = await pool.query<PayrollTrendRow>(`
    SELECT to_char(make_date(pay_period_year, pay_period_month, 1), 'YYYY-MM') AS month,
           pay_period_year * 12 + pay_period_month AS ym,
           sum(base_salary + ot_pay + bonus) AS gross,
           sum(net_pay) AS net,
           sum(sso) AS sso,
           sum(tax) AS tax
    FROM payroll_records
    WHERE pay_period_year * 12 + pay_period_month BETWEEN $1 AND $2
    GROUP BY 1, 2
    ORDER BY 2`,
    [endYm - 11, endYm]
  );
  const latest = rows.find((r) => r.ym === endYm);
  return {
    latestCost: latest
      ? {
          month: latest.month,
          gross: Number(latest.gross),
          net: Number(latest.net),
          sso: Number(latest.sso),
          tax: Number(latest.tax),
        }
      : null,
    costTrend: rows.map((r) => ({ month: r.month, gross: Number(r.gross), net: Number(r.net) })),
  };
}

interface DeptMetricRow {
  department: string;
  days: string | null;
  total: string | null;
  late: string | null;
  ot_pay: string | null;
  base: string | null;
}

/**
 * สุขภาพแผนก 3 มุมรวมตารางเดียว:
 * - วันลา (อนุมัติแล้ว) ต่อพนักงาน 1 คน ในปีของงวดที่เลือก
 * - % เข้าสาย (เข้าหลัง 08:00) จากการลงเวลาทั้งหมดของปีนั้น
 * - % OT ต่อเงินเดือน (SUM ot_pay / SUM base_salary ในหน้าต่าง 12 เดือน)
 */
async function buildDepartmentHealth(
  period: ExecutivePeriod,
  activeByDept: Map<string, number>
): Promise<ExecutiveStats['departmentHealth']> {
  const endYm = period.year * 12 + period.month;
  const { rows } = await pool.query<DeptMetricRow>(`
    SELECT d.department_name AS department,
           (SELECT COALESCE(SUM(lr.end_date - lr.start_date + 1), 0)
            FROM leave_requests lr
            JOIN employees e2 ON e2.employee_id = lr.employee_id
            WHERE e2.department_id = d.department_id
              AND lr.status = 'approved'
              AND EXTRACT(YEAR FROM lr.start_date) = $1) AS days,
           (SELECT count(a.attendance_id) FROM attendance a
            JOIN employees e3 ON e3.employee_id = a.employee_id
            WHERE e3.department_id = d.department_id
              AND EXTRACT(YEAR FROM a.work_date) = $1) AS total,
           (SELECT count(*) FROM attendance a
            JOIN employees e4 ON e4.employee_id = a.employee_id
            WHERE e4.department_id = d.department_id
              AND EXTRACT(YEAR FROM a.work_date) = $1
              AND a.check_in > TIME '08:00:00') AS late,
           (SELECT COALESCE(SUM(p.ot_pay), 0) FROM payroll_records p
            JOIN employees e5 ON e5.employee_id = p.employee_id
            WHERE e5.department_id = d.department_id
              AND (p.pay_period_year * 12 + p.pay_period_month) BETWEEN $2 AND $3) AS ot_pay,
           (SELECT COALESCE(SUM(p.base_salary), 0) FROM payroll_records p
            JOIN employees e6 ON e6.employee_id = p.employee_id
            WHERE e6.department_id = d.department_id
              AND (p.pay_period_year * 12 + p.pay_period_month) BETWEEN $2 AND $3) AS base
    FROM departments d
    ORDER BY d.department_name`,
    [period.year, endYm - 11, endYm]
  );
  return rows.map((r) => {
    const active = activeByDept.get(r.department) ?? 0;
    const totalPunches = Number(r.total ?? 0);
    const base = Number(r.base ?? 0);
    return {
      department: r.department,
      activeEmployees: active,
      leaveDaysPerEmployee: active > 0 ? Math.round((Number(r.days ?? 0) / active) * 10) / 10 : null,
      lateRate: totalPunches > 0 ? Math.round((Number(r.late ?? 0) / totalPunches) * 1000) / 10 : null,
      otRatio: base > 0 ? Math.round((Number(r.ot_pay ?? 0) / base) * 1000) / 10 : null,
    };
  });
}

interface WorkforceRow {
  hired_this_year: string;
  terminated: string;
  active: string;
  total: string;
}

/** กำลังคน + pipeline สรรหา: จ้างใหม่ปีนี้, ลาออกสะสม, อัตราคงอยู่, ตำแหน่งเปิด, ผู้สมัครแยก stage */
async function queryWorkforce(
  year: number
): Promise<{ workforce: ExecutiveStats['workforce']; applicantsByStage: ExecutiveStats['applicantsByStage'] }> {
  const [wf, openPos, stages] = await Promise.all([
    pool.query<WorkforceRow>(`
      SELECT count(*) FILTER (WHERE hire_date >= make_date($1, 1, 1)) AS hired_this_year,
             count(*) FILTER (WHERE status = 'terminated') AS terminated,
             count(*) FILTER (WHERE status = 'active') AS active,
             count(*) AS total
      FROM employees`,
      [year]
    ),
    pool.query<{ open_positions: string; open_headcount: string }>(
      "SELECT count(*) AS open_positions, COALESCE(SUM(headcount), 0) AS open_headcount FROM positions WHERE status = 'open'"
    ),
    pool.query<{ status: string; count: string }>('SELECT status, count(*) AS count FROM applicants GROUP BY 1 ORDER BY 1'),
  ]);
  const row = wf.rows[0];
  const total = Number(row.total);
  return {
    workforce: {
      hiredThisYear: Number(row.hired_this_year),
      terminated: Number(row.terminated),
      retentionRate: total > 0 ? Math.round((Number(row.active) / total) * 1000) / 10 : 0,
      openPositions: Number(openPos.rows[0].open_positions),
      openHeadcount: Number(openPos.rows[0].open_headcount),
    },
    applicantsByStage: stages.rows.map((s) => ({ status: s.status, count: Number(s.count) })),
  };
}

interface SpreadRow {
  department: string;
  min_salary: string | null;
  median_salary: string | null;
  max_salary: string | null;
}

/** ช่วงเงินเดือนพนักงาน active ต่อแผนก (ต่ำ/กลาง/สูง — กลางใช้ percentile 50) */
async function querySalarySpread(): Promise<ExecutiveStats['salarySpread']> {
  const { rows } = await pool.query<SpreadRow>(`
    SELECT d.department_name AS department,
           MIN(e.salary) FILTER (WHERE e.status = 'active') AS min_salary,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY e.salary) FILTER (WHERE e.status = 'active') AS median_salary,
           MAX(e.salary) FILTER (WHERE e.status = 'active') AS max_salary
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.department_id
    GROUP BY 1
    HAVING count(*) FILTER (WHERE e.status = 'active') > 0
    ORDER BY 1`);
  return rows.map((r) => ({
    department: r.department,
    min: Number(r.min_salary),
    median: Math.round(Number(r.median_salary)),
    max: Number(r.max_salary),
  }));
}

/** รายงานลับเฉพาะผู้บริหาร: ต้นทุน+แนวโน้ม 12 เดือน, สุขภาพแผนก, กำลังคน, pipeline สรรหา, ช่วงเงินเดือน, Top 5 */
export async function getExecutiveStats(requested?: ExecutivePeriod): Promise<ExecutiveStats> {
  // งวดที่ใช้: ที่ส่งมา > payroll ล่าสุด > (fallback) เดือนปัจจุบัน
  const payrollPeriod = await resolvePeriod(requested);
  const period = payrollPeriod ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

  const [costStats, byDept, topEarners, headcount, spread, workforceResult] = await Promise.all([
    queryCostStats(period),
    pool.query<DeptSalaryRow>(`
      SELECT d.department_name AS department,
             count(e.employee_id) FILTER (WHERE e.status = 'active') AS active_employees,
             ROUND(AVG(e.salary) FILTER (WHERE e.status = 'active')) AS avg_salary
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.department_id
      GROUP BY d.department_name
      ORDER BY avg_salary DESC NULLS LAST`),
    pool.query<TopEarnerRow>(`
      SELECT e.employee_id AS id,
             e.first_name || ' ' || e.last_name AS name,
             e.position,
             d.department_name AS department,
             e.salary
      FROM employees e
      JOIN departments d ON d.department_id = e.department_id
      WHERE e.status = 'active'
      ORDER BY e.salary DESC
      LIMIT 5`),
    pool.query<HeadcountRow>(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE status = 'active') AS active,
              ROUND(AVG(salary) FILTER (WHERE status = 'active')) AS avg_salary
       FROM employees`
    ),
    querySalarySpread(),
    queryWorkforce(period.year),
  ]);

  const activeByDept = new Map(byDept.rows.map((r) => [r.department, Number(r.active_employees)]));
  const departmentHealth = await buildDepartmentHealth(period, activeByDept);

  const lc = costStats.latestCost;
  const hc = headcount.rows[0];
  return {
    period: payrollPeriod,
    latestCost: lc ? { month: lc.month, gross: lc.gross, net: lc.net, sso: lc.sso, tax: lc.tax } : null,
    costTrend: costStats.costTrend,
    byDepartment: byDept.rows.map((r) => ({
      department: r.department,
      activeEmployees: Number(r.active_employees),
      avgSalary: r.avg_salary == null ? null : Number(r.avg_salary),
    })),
    departmentHealth,
    workforce: workforceResult.workforce,
    applicantsByStage: workforceResult.applicantsByStage,
    salarySpread: spread,
    topEarners: topEarners.rows.map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      department: r.department,
      salary: Number(r.salary),
    })),
    headcount: {
      total: Number(hc.total),
      active: Number(hc.active),
      avgSalary: hc.avg_salary == null ? null : Number(hc.avg_salary),
    },
  };
}
