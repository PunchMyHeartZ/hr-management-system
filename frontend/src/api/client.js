const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = localStorage.getItem('hr_token');
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('hr_token');
      window.dispatchEvent(new Event('hr-unauthorized'));
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getEmployees: () => request('/employees'),
  getDepartments: () => request('/departments'),
  createEmployee: (body) =>
    request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id, body) =>
    request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getLeaves: () => request('/leaves'),
  createLeave: (body) =>
    request('/leaves', { method: 'POST', body: JSON.stringify(body) }),
  updateLeaveStatus: (id, status) =>
    request(`/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAttendance: () => request('/attendance'),
  clockIn: (employeeId) =>
    request('/attendance/check-in', { method: 'POST', body: JSON.stringify({ employee_id: employeeId }) }),
  clockOut: (employeeId) =>
    request('/attendance/check-out', { method: 'POST', body: JSON.stringify({ employee_id: employeeId }) }),
  getPayroll: (year, month) => request(`/payroll?year=${year}&month=${month}`),
  generatePayroll: (year, month) =>
    request('/payroll/generate', { method: 'POST', body: JSON.stringify({ year, month }) }),
  saveBonus: (employeeId, bonusYear, amount) =>
    request('/payroll/bonus', { method: 'PUT', body: JSON.stringify({ employee_id: employeeId, bonus_year: bonusYear, amount }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  getDashboard: () => request('/stats/dashboard'),
  getExecutive: () => request('/stats/executive'),
};
