// ==============================
// NavContext — จัดการ tab ปัจจุบัน (navigation) และการเปิดโปรไฟล์พนักงานจากหน้าอื่น
// ==============================
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// ค่า tab ทั้งหมดที่ใช้ในแอป (แยกตาม role: HR/Employee)
export type TabValue =
  | 'dashboard'
  | 'employees'
  | 'leaves'
  | 'calendar'
  | 'attendance'
  | 'payroll'
  | 'departments'
  | 'reviews'
  | 'recruitment'
  | 'execinsights'
  | 'profile'
  | 'myleaves'
  | 'mypayslips';

interface NavContextValue {
  tab: TabValue;
  goTab: (tab: TabValue) => void;
  profileEmployeeId: number | null;
  openProfile: (employeeId: number) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

/** Provider ของ navigation — เก็บ tab ปัจจุบัน (defaultTab) และ id พนักงานที่เปิดโปรไฟล์ล่าสุด */
export function NavProvider({ children, defaultTab }: { children: ReactNode; defaultTab: TabValue }) {
  const [tab, setTab] = useState<TabValue>(defaultTab);
  const [profileEmployeeId, setProfileEmployeeId] = useState<number | null>(null);

  const goTab = useCallback((next: TabValue) => setTab(next), []);

  // เปิดโปรไฟล์พนักงาน: จำ id ไว้แล้วสลับไป tab โปรไฟล์ทันที
  const openProfile = useCallback((employeeId: number) => {
    setProfileEmployeeId(employeeId);
    setTab('profile');
  }, []);

  const value = useMemo(
    () => ({ tab, goTab, profileEmployeeId, openProfile }),
    [tab, goTab, profileEmployeeId, openProfile]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

/** hook เข้าถึงสถานะ navigation — ต้องใช้ภายใน NavProvider เท่านั้น */
export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
