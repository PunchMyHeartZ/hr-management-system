import * as Tabs from '@radix-ui/react-tabs';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import LeavesPage from './pages/LeavesPage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import ExecutivePage from './pages/ExecutivePage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

function MainApp() {
  return (
    <Tabs.Root defaultValue="dashboard" orientation="vertical">
      <AppLayout>
        <Tabs.Content value="dashboard">
          <DashboardPage />
        </Tabs.Content>
        <Tabs.Content value="employees">
          <EmployeesPage />
        </Tabs.Content>
        <Tabs.Content value="leaves">
          <LeavesPage />
        </Tabs.Content>
        <Tabs.Content value="attendance">
          <AttendancePage />
        </Tabs.Content>
        <Tabs.Content value="payroll">
          <PayrollPage />
        </Tabs.Content>
        <Tabs.Content value="execinsights">
          <ExecutivePage />
        </Tabs.Content>
      </AppLayout>
    </Tabs.Root>
  );
}

export default function App() {
  const { user, booting } = useAuth();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-azure-200 border-t-azure-600" />
      </div>
    );
  }

  return user ? <MainApp /> : <AuthPage />;
}
