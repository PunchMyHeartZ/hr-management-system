import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Banknote, TrendingUp, Wallet, Users, Crown } from 'lucide-react';
import { api } from '../api/client';
import type { ExecutiveStats } from '../api/schemas';
import { formatMoney } from '../lib/format';
import { SkeletonCards, SkeletonCharts } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';

const RANK_STYLES = [
  'bg-amber-100 text-amber-700',
  'bg-slate-200 text-slate-600',
  'bg-orange-100 text-orange-700',
  'bg-slate-100 text-slate-500',
  'bg-slate-100 text-slate-500',
];

export default function ExecutivePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<ExecutiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  useEffect(() => {
    if (user?.role === 'executive') {
      api.getExecutive().then(setData).catch((e: Error) => setError(e.message));
    }
  }, [user]);

  if (user?.role !== 'executive') {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
        {t('executive.confidential')}
      </p>
    );
  }

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

  const kFormat = (v: unknown) => `${Math.round(Number(v) / 1000)}k`;
  const moneyTooltip = (value: unknown): [string, string] => [formatMoney(Number(value), locale), ''];

  const kpis: { icon: React.ReactNode; bg: string; label: string; value: React.ReactNode; sub: string }[] = [
    {
      icon: <Banknote className="h-5 w-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      label: t('executive.monthlyCost'),
      value: data.latestCost ? formatMoney(data.latestCost.gross, locale) : '-',
      sub: data.latestCost ? data.latestCost.month : t('executive.noPayroll'),
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-azure-600" />,
      bg: 'bg-azure-50',
      label: t('executive.annualEstimate'),
      value: data.latestCost ? formatMoney(data.latestCost.gross * 12, locale) : '-',
      sub: '',
    },
    {
      icon: <Wallet className="h-5 w-5 text-sky-600" />,
      bg: 'bg-sky-50',
      label: t('executive.avgSalary'),
      value:
        data.headcount.avgSalary == null ? '-' : formatMoney(data.headcount.avgSalary, locale),
      sub: '',
    },
    {
      icon: <Users className="h-5 w-5 text-amber-600" />,
      bg: 'bg-amber-50',
      label: t('executive.activeEmployees'),
      value: `${data.headcount.active} / ${data.headcount.total}`,
      sub: '',
    },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            {t('executive.title')}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <Crown className="h-3.5 w-3.5" />
              {t('executive.confidential')}
            </span>
          </h2>
          <p className="text-sm text-slate-500">{t('executive.subtitle')}</p>
        </div>
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
        <div className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">{t('executive.avgByDepartment')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDepartment} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickFormatter={kFormat} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip formatter={moneyTooltip} />
                <Bar dataKey="avgSalary" fill="#0284C7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">{t('executive.topEarners')}</h3>
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3">{t('executive.rank')}</th>
                <th className="pb-2 pr-3">{t('employees.table.name')}</th>
                <th className="pb-2 pr-3">{t('employees.table.position')}</th>
                <th className="pb-2 text-right">{t('employees.table.salary')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.topEarners.map((e, i) => (
                <tr key={e.id}>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${RANK_STYLES[i] ?? RANK_STYLES[4]}`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar id={e.id} name={e.name} size="lg" />
                      <div>
                        <div className="font-medium text-slate-900">{e.name}</div>
                        <div className="text-xs text-slate-400">{e.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">{e.position}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">
                    {formatMoney(e.salary, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
