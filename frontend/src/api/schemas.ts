// ==============================
// Zod schemas + TypeScript types — นิยามรูปร่างข้อมูลจาก API และ validation ของฟอร์มต่าง ๆ
// ==============================
import { z } from 'zod';

// ---------- ประเภท (type) ร่วม ----------
export type UserRole = 'hr' | 'executive';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

// ---------- สมาชิก / การยืนยันตัวตน (user, auth) ----------
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  full_name: z.string(),
  role: z.string(),
  employee_id: z.number().nullable().optional(),
});
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

// ---------- พนักงาน (employee) ----------
export const employeeSchema = z.object({
  employee_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  position: z.string(),
  department_id: z.number(),
  department_name: z.string(),
  hire_date: z.string().nullable(),
  // z.coerce.number() แปลงค่าจาก API (อาจมาเป็น string) ให้เป็นตัวเลขอัตโนมัติ
  salary: z.coerce.number(),
  status: z.string(),
  annual_leave_quota: z.number(),
  used_leave_days: z.coerce.number(),
});
export type Employee = z.infer<typeof employeeSchema>;

export const employeeListSchema = z.array(employeeSchema);

// ---------- แผนก (department) ----------
export const departmentSchema = z.object({
  department_id: z.number(),
  department_name: z.string(),
  department_code: z.string(),
});
export type Department = z.infer<typeof departmentSchema>;

export const departmentListSchema = z.array(departmentSchema);

// ---------- การลา (leave) ----------
export const leaveSchema = z.object({
  leave_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string(),
  leave_type: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  total_days: z.number(),
  reason: z.string().nullable(),
  status: z.string(),
});
export type LeaveRequest = z.infer<typeof leaveSchema>;

export const leaveListSchema = z.array(leaveSchema);

// ---------- เวลาเข้า-ออกงาน (attendance) ----------
// is_late = เข้าหลัง 08:00 (backend คำนวณเทียบเวลาเข้างานปกติให้)
export const attendanceSchema = z.object({
  attendance_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string(),
  work_date: z.string(),
  check_in: z.string().nullable(),
  check_out: z.string().nullable(),
  worked_hours: z.coerce.number().nullable(),
  ot_hours: z.coerce.number(),
  is_late: z.boolean(),
});
export type AttendanceRecord = z.infer<typeof attendanceSchema>;

export const attendanceListSchema = z.array(attendanceSchema);

// ---------- payroll (สลิปเงินเดือน) ----------
export const payrollRecordSchema = z.object({
  payroll_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string(),
  pay_period_year: z.number(),
  pay_period_month: z.number(),
  base_salary: z.coerce.number(),
  ot_hours: z.coerce.number(),
  ot_pay: z.coerce.number(),
  bonus: z.coerce.number(),
  sso: z.coerce.number(),
  tax: z.coerce.number(),
  net_pay: z.coerce.number(),
});
export type PayrollRecord = z.infer<typeof payrollRecordSchema>;

export const payrollListSchema = z.array(payrollRecordSchema);

// ตัวเลขเงินรายเดือน (ใช้ซ้ำใน dashboard/executive stats)
const monthMoneySchema = z.object({
  month: z.string(),
  gross: z.number(),
  net: z.number(),
  sso: z.number(),
  tax: z.number(),
});

// ---------- สถิติหน้า dashboard (HR) ----------
export const dashboardStatsSchema = z.object({
  employeeCount: z.number(),
  activeEmployees: z.number(),
  pendingLeaves: z.number(),
  leavesByMonth: z.array(
    z.object({ month: z.string(), count: z.number(), days: z.number() })
  ),
  leavesByType: z.array(
    z.object({ type: z.string(), count: z.number(), days: z.number() })
  ),
  payrollByMonth: z.array(monthMoneySchema),
  latestPay: monthMoneySchema.extend({ ot_hours: z.number() }).nullable(),
  payrollByDepartment: z.array(
    z.object({ department: z.string(), employees: z.number(), net: z.number() })
  ),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// ---------- สถิติหน้า executive insights ----------
export const executiveStatsSchema = z.object({
  // งวดที่รายงานอ้างอิง (null = ยังไม่มีข้อมูล payroll เลย)
  period: z.object({ year: z.number(), month: z.number() }).nullable(),
  latestCost: monthMoneySchema.nullable(),
  // แนวโน้มต้นทุนย้อนหลัง 12 เดือน (gross = รวมโบนัส+OT, net = เงินสุทธิรวม)
  costTrend: z.array(z.object({ month: z.string(), gross: z.number(), net: z.number() })),
  byDepartment: z.array(
    z.object({
      department: z.string(),
      activeEmployees: z.number(),
      avgSalary: z.number().nullable(),
    })
  ),
  // สุขภาพแผนก: วันลา/คน, % เข้าสาย, % OT ต่อเงินเดือน (null = ไม่มีข้อมูลมากพอจะคำนวณ)
  departmentHealth: z.array(
    z.object({
      department: z.string(),
      activeEmployees: z.number(),
      leaveDaysPerEmployee: z.number().nullable(),
      lateRate: z.number().nullable(),
      otRatio: z.number().nullable(),
    })
  ),
  // กำลังคน: จ้างใหม่ปีนี้, ลาออกสะสม, อัตราคงอยู่, ตำแหน่งเปิดรับ
  workforce: z.object({
    hiredThisYear: z.number(),
    terminated: z.number(),
    retentionRate: z.number(),
    openPositions: z.number(),
    openHeadcount: z.number(),
  }),
  // ผู้สมัครแยกตาม stage ของ pipeline
  applicantsByStage: z.array(z.object({ status: z.string(), count: z.number() })),
  // ช่วงเงินเดือนต่อแผนก (ต่ำ/กลาง/สูง)
  salarySpread: z.array(
    z.object({ department: z.string(), min: z.number(), median: z.number(), max: z.number() })
  ),
  topEarners: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      position: z.string(),
      department: z.string(),
      salary: z.number(),
    })
  ),
  headcount: z.object({
    total: z.number(),
    active: z.number(),
    avgSalary: z.number().nullable(),
  }),
});
export type ExecutiveStats = z.infer<typeof executiveStatsSchema>;

// ---------- schema ผลลัพธ์ย่อ (response ของ action ต่าง ๆ) ----------
export const leaveCreatedSchema = z.object({
  leave_id: z.number(),
  employee_id: z.number(),
  leave_type: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().nullable(),
  status: z.string(),
});

export const leaveStatusSchema = z.object({
  leave_id: z.number(),
  status: z.string(),
});

export const clockResultSchema = z.object({
  attendance_id: z.number(),
});

export const bonusResultSchema = z.object({
  bonus_id: z.number(),
  employee_id: z.number(),
  bonus_year: z.number(),
  amount: z.coerce.number(),
});

// ---------- payload/ฟอร์มสมัครสมาชิก (register) ----------
export interface RegisterPayload {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export const registerFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.email('A valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['hr', 'executive']),
});

// ---------- payload/ฟอร์มพนักงาน (employee) ----------
export interface EmployeePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  department_id: number;
  hire_date: string | null;
  salary: number;
  annual_leave_quota: number;
  status: EmployeeStatus;
}

export const employeeFormSchema = z.object({
  first_name: z.string().trim().min(1, 'First name and last name are required'),
  last_name: z.string().trim().min(1, 'First name and last name are required'),
  email: z.email('A valid email is required'),
  phone: z.string().trim(),
  position: z.string().trim().min(1, 'Position is required'),
  department_id: z.string().min(1, 'A department must be selected'),
  hire_date: z.string(),
  salary: z.coerce.number().min(0, 'Salary must be a non-negative number'),
  annual_leave_quota: z.coerce
    .number()
    .int('Annual leave quota must be 0-365 days')
    .min(0, 'Annual leave quota must be 0-365 days')
    .max(365, 'Annual leave quota must be 0-365 days'),
  status: z.enum(['active', 'inactive', 'terminated']),
});

// ---------- payload/ฟอร์มการลา (leave) ----------
export interface LeavePayload {
  employee_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export const leaveFormSchema = z
  .object({
    employee_id: z.string().min(1, 'An employee must be selected'),
    leave_type: z.enum(['annual', 'sick', 'personal', 'unpaid'], { message: 'A leave type must be selected' }),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    reason: z.string(),
  })
  // refine: บังคับว่าวันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น (เทียบเป็น string YYYY-MM-DD ได้)
  .refine((v) => v.end_date >= v.start_date, {
    message: 'end_date must be on or after start_date',
    path: ['end_date'],
  });

/** ดึงข้อความ error แรกจาก ZodError มาแสดงผล (ถ้าไม่มีใช้ข้อความ default) */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}

// ---------- ประกาศ (announcement) ----------
export const announcementSchema = z.object({
  announcement_id: z.number(),
  title: z.string(),
  body: z.string(),
  author_name: z.string().nullable(),
  created_at: z.string(),
});
export type Announcement = z.infer<typeof announcementSchema>;

export const announcementListSchema = z.array(announcementSchema);

export interface AnnouncementPayload {
  title: string;
  body: string;
}

// ---------- การประเมินผล (review) ----------
export const reviewGoalSchema = z.object({
  goal_id: z.number().optional(),
  title: z.string(),
  weight: z.coerce.number(),
  score: z.coerce.number().nullable().optional(),
});

export const reviewSchema = z.object({
  review_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string(),
  department_name: z.string(),
  period_year: z.number(),
  reviewer_name: z.string(),
  overall_score: z.coerce.number().nullable(),
  strengths: z.string().nullable(),
  improvements: z.string().nullable(),
  status: z.string(),
  goals: z.array(reviewGoalSchema).optional(),
});
export type Review = z.infer<typeof reviewSchema>;

export const reviewListSchema = z.array(reviewSchema);

export interface ReviewGoalPayload {
  title: string;
  weight: number;
  score: number | null;
}

export interface ReviewPayload {
  employee_id: number;
  period_year: number;
  reviewer_name: string;
  overall_score: number | null;
  strengths: string | null;
  improvements: string | null;
  status: 'draft' | 'final';
  goals: ReviewGoalPayload[];
}

// ---------- การสรรหาบุคลากร (recruitment: ตำแหน่งงาน + ผู้สมัคร) ----------
export const jobPositionSchema = z.object({
  position_id: z.number(),
  title: z.string(),
  department_id: z.number().nullable(),
  department_name: z.string().nullable(),
  description: z.string().nullable(),
  headcount: z.number(),
  status: z.string(),
  applicant_count: z.coerce.number(),
});
export type JobPosition = z.infer<typeof jobPositionSchema>;

export const positionListSchema = z.array(jobPositionSchema);

export interface PositionPayload {
  title: string;
  department_id: number;
  description: string | null;
  headcount: number;
  status: 'open' | 'closed';
}

export const applicantSchema = z.object({
  applicant_id: z.number(),
  position_id: z.number(),
  position_title: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  applied_at: z.string(),
});
export type Applicant = z.infer<typeof applicantSchema>;

export const applicantListSchema = z.array(applicantSchema);

export type ApplicantStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface ApplicantPayload {
  position_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
}

// ---------- payload อื่น ๆ (แผนก, บัญชีผู้ใช้พนักงาน) ----------
export interface DepartmentPayload {
  department_name: string;
  department_code: string;
}

export interface AccountPayload {
  username: string;
  password: string;
}

// ---------- ฟอร์ม validation ของ dialogs ต่าง ๆ ----------
export const accountFormSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const departmentFormSchema = z.object({
  department_name: z.string().trim().min(1, 'Department name is required').max(100),
  // toUpperCase() ทำหน้าที่เป็น transform บังคับรหัสแผนกเป็นตัวพิมพ์ใหญ่หลัง validate
  department_code: z.string().trim().min(1, 'Department code is required').max(10).toUpperCase(),
});

export const announcementFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().trim().min(1, 'Body is required'),
});

export const positionFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  department_id: z.string().min(1, 'A department must be selected'),
  description: z.string(),
  headcount: z.coerce.number().int('Headcount must be 1-50').min(1, 'Headcount must be 1-50').max(50, 'Headcount must be 1-50'),
  status: z.enum(['open', 'closed']),
});

export const applicantFormSchema = z.object({
  position_id: z.string().min(1, 'A position must be selected'),
  full_name: z.string().trim().min(1, 'Full name is required'),
  email: z.email('A valid email is required'),
  phone: z.string().trim(),
  notes: z.string(),
});
