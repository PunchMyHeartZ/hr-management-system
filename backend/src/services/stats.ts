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

export async function getDashboardStats(): Promise<DashboardStats> {
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

export interface ExecutiveStats {
  latestCost: { month: string; gross: number; net: number; sso: number; tax: number } | null;
  byDepartment: { department: string; activeEmployees: number; avgSalary: number | null }[];
  topEarners: { id: number; name: string; position: string; department: string; salary: number }[];
  headcount: { total: number; active: number; avgSalary: number | null };
}

export async function getExecutiveStats(): Promise<ExecutiveStats> {
  const [latestCost, byDept, topEarners, headcount] = await Promise.all([
    pool.query<CostMonthRow>(`
      SELECT to_char(make_date(pay_period_year, pay_period_month, 1), 'YYYY-MM') AS month,
             sum(base_salary + ot_pay + bonus) AS gross,
             sum(net_pay) AS net,
             sum(sso) AS sso,
             sum(tax) AS tax
      FROM payroll_records
      WHERE (pay_period_year * 12 + pay_period_month) =
            (SELECT max(pay_period_year * 12 + pay_period_month) FROM payroll_records)
      GROUP BY 1`),
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
  ]);

  const lc = latestCost.rows[0];
  const hc = headcount.rows[0];
  return {
    latestCost: lc
      ? {
          month: lc.month,
          gross: Number(lc.gross),
          net: Number(lc.net),
          sso: Number(lc.sso),
          tax: Number(lc.tax),
        }
      : null,
    byDepartment: byDept.rows.map((r) => ({
      department: r.department,
      activeEmployees: Number(r.active_employees),
      avgSalary: r.avg_salary == null ? null : Number(r.avg_salary),
    })),
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
