import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, CalendarClock, Banknote, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { DashboardStats } from '../api/schemas';
import { formatMoney } from '../lib/format';
import { SkeletonCards, SkeletonCharts } from '../components/Skeleton';
import AnnouncementsCard from '../components/AnnouncementsCard';

const PIE_COLORS = ['#0B57D0', '#38BDF8', '#0284C7', '#4F46E5'];

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  useEffect(() => {
    api.getDashboard().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <p className="banner-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {t('common.error')}: {error}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={4} />
        <SkeletonCharts />
      </div>
    );
  }

  const monthLabel = (m: ReactNode): string => {
    if (!m) return '-';
    const [y, mm] = String(m).split('-').map(Number);
    return new Date(y, mm - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
  };
  const kFormat = (v: unknown) => `${Math.round(Number(v) / 1000)}k`;
  const moneyTooltip = (value: unknown): [string, string] => [formatMoney(Number(value), locale), ''];

  const kpis: { icon: ReactNode; bg: string; label: string; value: ReactNode; sub: string }[] = [
    {
      icon: <Users className="h-5 w-5 text-azure-600" />,
      bg: 'bg-azure-50',
      label: t('dashboard.kpi.employees'),
      value: data.employeeCount,
      sub: `${data.activeEmployees} ${t('dashboard.kpi.active')}`,
    },
    {
      icon: <CalendarClock className="h-5 w-5 text-amber-600" />,
      bg: 'bg-amber-50',
      label: t('dashboard.kpi.pendingLeaves'),
      value: data.pendingLeaves,
      sub: '',
    },
    {
      icon: <Banknote className="h-5 w-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      label: t('dashboard.kpi.payable'),
      value: data.latestPay ? formatMoney(data.latestPay.net, locale) : '-',
      sub: data.latestPay ? monthLabel(data.latestPay.month) : '',
    },
    {
      icon: <Timer className="h-5 w-5 text-teal-700" />,
      bg: 'bg-teal-50',
      label: t('dashboard.kpi.otHours'),
      value: data.latestPay ? Number(data.latestPay.ot_hours).toFixed(1) : '-',
      sub: data.latestPay ? monthLabel(data.latestPay.month) : '',
    },
  ];

  const pieData = data.leavesByType.map((x) => ({ ...x, label: t(`leaves.types.${x.type}`) }));

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">{t('dashboard.title')}</h2>
        <p className="text-sm text-slate-500">{t('dashboard.subtitle')}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{k.label}</span>
              <span className={`rounded-lg p-2 ${k.bg}`}>{k.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{k.value}</div>
            {k.sub && <div className="mt-0.5 text-xs text-slate-400">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 lg:col-span-2">
          <AnnouncementsCard />
        </div>

        <ChartCard title={t('dashboard.leavesByMonth')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.leavesByMonth} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: unknown, name: unknown): [string, string] =>
                    name === 'days' ? [String(value), t('dashboard.days')] : [String(value), t('dashboard.requests')]
                  }
                  labelFormatter={monthLabel}
                />
                <Legend formatter={(value: unknown) => (value === 'days' ? t('dashboard.days') : t('dashboard.requests'))} />
                <Bar dataKey="days" fill="#0B57D0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t('dashboard.leavesByType')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="days"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.type} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown): [string, string] => [`${value} ${t('dashboard.days')}`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t('dashboard.payrollByMonth')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.payrollByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tickFormatter={kFormat} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip formatter={moneyTooltip} labelFormatter={monthLabel} />
                <Legend formatter={(value: unknown) => (value === 'net' ? t('payroll.netPay') : value === 'sso' ? t('payroll.sso') : t('payroll.tax'))} />
                <Bar dataKey="net" fill="#0B57D0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="sso" fill="#38BDF8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="tax" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t('dashboard.payrollByDepartment')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.payrollByDepartment}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" />
                <XAxis type="number" tickFormatter={kFormat} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  type="category"
                  dataKey="department"
                  width={110}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                />
                <Tooltip formatter={moneyTooltip} />
                <Bar dataKey="net" fill="#0284C7" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
