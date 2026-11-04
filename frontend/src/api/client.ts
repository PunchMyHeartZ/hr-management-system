import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import {
  announcementListSchema,
  announcementSchema,
  authResponseSchema,
  attendanceListSchema,
  bonusResultSchema,
  clockResultSchema,
  dashboardStatsSchema,
  departmentListSchema,
  employeeListSchema,
  employeeSchema,
  executiveStatsSchema,
  leaveCreatedSchema,
  leaveListSchema,
  leaveStatusSchema,
  payrollListSchema,
  reviewListSchema,
  reviewSchema,
  positionListSchema,
  applicantListSchema,
  userSchema,
  jobPositionSchema,
  applicantSchema,
  departmentSchema,
} from './schemas';
import type {
  EmployeePayload,
  ExecutiveStats,
  DashboardStats,
  AttendanceRecord,
  AuthResponse,
  Department,
  Employee,
  LeavePayload,
  LeaveRequest,
  LeaveStatus,
  PayrollRecord,
  RegisterPayload,
  User,
  Announcement,
  AnnouncementPayload,
  Review,
  ReviewPayload,
  JobPosition,
  PositionPayload,
  Applicant,
  ApplicantPayload,
  ApplicantStatus,
  DepartmentPayload,
  AccountPayload,
} from './schemas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const http = axios.create({ baseURL: `${API_URL}/api` });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('hr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hr_token');
      window.dispatchEvent(new Event('hr-unauthorized'));
    }
    const message = error.response?.data?.error ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);

async function request<T>(schema: z.ZodType<T>, config: AxiosRequestConfig): Promise<T> {
  const response = await http.request(config);
  return schema.parse(response.data);
}

export const api = {
  getEmployees: () => request<Employee[]>(employeeListSchema, { url: '/employees' }),
  getEmployee: (id: number) => request<Employee>(employeeSchema, { url: `/employees/${id}` }),
  getDepartments: () => request<Department[]>(departmentListSchema, { url: '/departments' }),
  createDepartment: (body: DepartmentPayload) =>
    request<Department>(departmentSchema, { url: '/departments', method: 'POST', data: body }),
  updateDepartment: (id: number, body: DepartmentPayload) =>
    request<Department>(departmentSchema, { url: `/departments/${id}`, method: 'PUT', data: body }),
  deleteDepartment: (id: number) =>
    request<{ deleted: boolean }>(z.object({ deleted: z.boolean() }), { url: `/departments/${id}`, method: 'DELETE' }),
  createEmployeeAccount: (id: number, body: AccountPayload) =>
    request<unknown>(z.object({ user_id: z.number() }), { url: `/employees/${id}/account`, method: 'POST', data: body }),
  createEmployee: (body: EmployeePayload) =>
    request<Employee>(employeeSchema, { url: '/employees', method: 'POST', data: body }),
  updateEmployee: (id: number, body: EmployeePayload) =>
    request<Employee>(employeeSchema, { url: `/employees/${id}`, method: 'PUT', data: body }),
  getLeaves: (employeeId?: number) =>
    request<LeaveRequest[]>(leaveListSchema, {
      url: '/leaves',
      params: employeeId ? { employee_id: employeeId } : undefined,
    }),
  createLeave: (body: LeavePayload) =>
    request<unknown>(leaveCreatedSchema, { url: '/leaves', method: 'POST', data: body }),
  updateLeaveStatus: (id: number, status: LeaveStatus) =>
    request<unknown>(leaveStatusSchema, {
      url: `/leaves/${id}/status`,
      method: 'PATCH',
      data: { status },
    }),
  getAttendance: (employeeId?: number) =>
    request<AttendanceRecord[]>(attendanceListSchema, {
      url: '/attendance',
      params: employeeId ? { employee_id: employeeId } : undefined,
    }),
  clockIn: (employeeId: number) =>
    request<unknown>(clockResultSchema, {
      url: '/attendance/check-in',
      method: 'POST',
      data: { employee_id: employeeId },
    }),
  clockOut: (employeeId: number) =>
    request<unknown>(clockResultSchema, {
      url: '/attendance/check-out',
      method: 'POST',
      data: { employee_id: employeeId },
    }),
  getPayroll: (year: number, month: number, employeeId?: number) =>
    request<PayrollRecord[]>(payrollListSchema, {
      url: '/payroll',
      params: { year, month, ...(employeeId ? { employee_id: employeeId } : {}) },
    }),
  generatePayroll: (year: number, month: number) =>
    request<PayrollRecord[]>(payrollListSchema, { url: '/payroll/generate', method: 'POST', data: { year, month } }),
  saveBonus: (employeeId: number, bonusYear: number, amount: number) =>
    request<unknown>(bonusResultSchema, {
      url: '/payroll/bonus',
      method: 'PUT',
      data: { employee_id: employeeId, bonus_year: bonusYear, amount },
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>(authResponseSchema, { url: '/auth/login', method: 'POST', data: { email, password } }),
  register: (payload: RegisterPayload) =>
    request<AuthResponse>(authResponseSchema, { url: '/auth/register', method: 'POST', data: payload }),
  getMe: () => request<User>(userSchema, { url: '/auth/me' }),
  getDashboard: () => request<DashboardStats>(dashboardStatsSchema, { url: '/stats/dashboard' }),
  getExecutive: () => request<ExecutiveStats>(executiveStatsSchema, { url: '/stats/executive' }),
  getAnnouncements: () => request<Announcement[]>(announcementListSchema, { url: '/announcements' }),
  createAnnouncement: (body: AnnouncementPayload) =>
    request<Announcement>(announcementSchema, {
      url: '/announcements',
      method: 'POST',
      data: body,
    }),
  deleteAnnouncement: (id: number) =>
    request<{ deleted: boolean }>(z.object({ deleted: z.boolean() }), {
      url: `/announcements/${id}`,
      method: 'DELETE',
    }),
  getReviews: (employeeId?: number) =>
    request<Review[]>(reviewListSchema, {
      url: '/reviews',
      params: employeeId ? { employee_id: employeeId } : undefined,
    }),
  getReview: (id: number) => request<Review>(reviewSchema, { url: `/reviews/${id}` }),
  createReview: (body: ReviewPayload) =>
    request<Review>(reviewSchema, { url: '/reviews', method: 'POST', data: body }),
  updateReview: (id: number, body: Omit<ReviewPayload, 'employee_id'>) =>
    request<Review>(reviewSchema, { url: `/reviews/${id}`, method: 'PUT', data: body }),
  deleteReview: (id: number) =>
    request<{ deleted: boolean }>(z.object({ deleted: z.boolean() }), { url: `/reviews/${id}`, method: 'DELETE' }),
  getPositions: () => request<JobPosition[]>(positionListSchema, { url: '/recruitment/positions' }),
  createPosition: (body: PositionPayload) =>
    request<JobPosition>(jobPositionSchema, { url: '/recruitment/positions', method: 'POST', data: body }),
  updatePosition: (id: number, body: PositionPayload) =>
    request<JobPosition>(jobPositionSchema, { url: `/recruitment/positions/${id}`, method: 'PUT', data: body }),
  deletePosition: (id: number) =>
    request<{ deleted: boolean }>(z.object({ deleted: z.boolean() }), {
      url: `/recruitment/positions/${id}`,
      method: 'DELETE',
    }),
  getApplicants: (positionId?: number) =>
    request<Applicant[]>(applicantListSchema, {
      url: '/recruitment/applicants',
      params: positionId ? { position_id: positionId } : undefined,
    }),
  createApplicant: (body: ApplicantPayload) =>
    request<Applicant>(applicantSchema, { url: '/recruitment/applicants', method: 'POST', data: body }),
  updateApplicantStatus: (id: number, status: ApplicantStatus) =>
    request<unknown>(z.object({ applicant_id: z.number(), status: z.string() }), {
      url: `/recruitment/applicants/${id}/status`,
      method: 'PATCH',
      data: { status },
    }),
};
