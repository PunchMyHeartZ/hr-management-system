// ==============================
// โครงสร้างหลักของแอป — สลับหน้าจอตาม role (HR/Executive ใช้ HRApp, พนักงานใช้ EmployeeApp)
// ==============================
import * as Tabs from '@radix-ui/react-tabs';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import LeavesPage from './pages/LeavesPage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import ExecutivePage from './pages/ExecutivePage';
import AuthPage from './pages/AuthPage';
import LeaveCalendarPage from './pages/LeaveCalendarPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ReviewsPage from './pages/ReviewsPage';
import RecruitmentPage from './pages/RecruitmentPage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import { useAuth } from './context/AuthContext';
import { NavProvider, useNav } from './context/NavContext';
import type { TabValue } from './context/NavContext';

/** แอปหลักสำหรับ HR/Executive — แสดง tab ครบทุกหน้า (เพิ่มหน้า Executive Insights เมื่อเป็น executive) */
function HRApp({ isExecutive }: { isExecutive: boolean }) {
  const { tab, goTab } = useNav();
  return (
    <Tabs.Root value={tab} onValueChange={(v) => goTab(v as TabValue)} orientation="vertical">
      <AppLayout>
        <Tabs.Content value="dashboard">
          <DashboardPage />
        </Tabs.Content>
        <Tabs.Content value="employees">
          <EmployeesPage />
        </Tabs.Content>
        <Tabs.Content value="profile">
          <ProfileTab />
        </Tabs.Content>
        <Tabs.Content value="leaves">
          <LeavesPage />
        </Tabs.Content>
        <Tabs.Content value="calendar">
          <LeaveCalendarPage />
        </Tabs.Content>
        <Tabs.Content value="attendance">
          <AttendancePage />
        </Tabs.Content>
        <Tabs.Content value="payroll">
          <PayrollPage />
        </Tabs.Content>
        <Tabs.Content value="departments">
          <DepartmentsPage />
        </Tabs.Content>
        <Tabs.Content value="reviews">
          <ReviewsPage />
        </Tabs.Content>
        <Tabs.Content value="recruitment">
          <RecruitmentPage />
        </Tabs.Content>
        {isExecutive && (
          <Tabs.Content value="execinsights">
            <ExecutivePage />
          </Tabs.Content>
        )}
      </AppLayout>
    </Tabs.Root>
  );
}

/** แอปสำหรับพนักงานทั่วไป — เห็นเฉพาะ 3 หน้า: โปรไฟล์ตัวเอง, การลาของตัวเอง, สลิปเงินเดือน */
function EmployeeApp() {
  const { tab, goTab } = useNav();
  const { user } = useAuth();
  return (
    <Tabs.Root value={tab} onValueChange={(v) => goTab(v as TabValue)} orientation="vertical">
      <AppLayout>
        <Tabs.Content value="profile">
          <EmployeeProfilePage employeeId={user?.employee_id ?? null} />
        </Tabs.Content>
        <Tabs.Content value="myleaves">
          <LeavesPage self />
        </Tabs.Content>
        <Tabs.Content value="mypayslips">
          <PayrollPage />
        </Tabs.Content>
      </AppLayout>
    </Tabs.Root>
  );
}

/** tab โปรไฟล์ของ HR — แสดงโปรไฟล์พนักงานคนล่าสุดที่เลือกผ่าน openProfile */
function ProfileTab() {
  const { profileEmployeeId } = useNav();
  return <EmployeeProfilePage employeeId={profileEmployeeId} />;
}

/** คอมโพเนนต์รากของแอป — จัดการสถานะ booting, หน้า login และเลือกแอปตาม role ของผู้ใช้ */
export default function App() {
  const { user, booting } = useAuth();

  // ส่วนขณะกำลังตรวจสอบ token ตอนเปิดแอป (แสดง spinner)
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-azure-200 border-t-azure-600" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // กำหนด tab เริ่มต้น: พนักงานเริ่มที่โปรไฟล์ ส่วน HR/Executive เริ่มที่ dashboard
  const defaultTab: TabValue = user.role === 'employee' ? 'profile' : 'dashboard';

  return (
    <NavProvider defaultTab={defaultTab}>
      {/* เลือกโครงแอปตาม role ของผู้ใช้ */}
      {user.role === 'employee' ? (
        <EmployeeApp />
      ) : (
        <HRApp isExecutive={user.role === 'executive'} />
      )}
    </NavProvider>
  );
}
