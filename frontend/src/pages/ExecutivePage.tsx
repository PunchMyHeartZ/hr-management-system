// ==============================
// หน้า Executive Insights — รายงานลับสำหรับผู้บริหาร
// ครบ 3 มุม: ต้นทุน (KPI + แนวโน้ม 12 เดือน) / สุขภาพองค์กร (แผนก + กำลังคน + pipeline)
// / เงินเดือน (ช่วงต่อแผนก + Top 5) — เลือกงวดดูย้อนหลัง + ส่งออก CSV ได้
// ==============================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import * as Select from '@radix-ui/react-select';
import {
  Banknote,
  TrendingUp,
  Wallet,
  Users,
  Crown,
  UserPlus2,
  UserMinus,
  HeartPulse,
  Briefcase,
  Download,
} from 'lucide-react';
import { api } from '../api/client';
import type { ExecutiveStats } from '../api/schemas';
import { formatMoney } from '../lib/format';
import { SkeletonCards, SkeletonCharts } from '../components/Skeleton';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';

// สีเหรียญอันดับ 1-5 ของตาราง top earners (ทอง/เงิน/ทองแดง)
const RANK_STYLES = [
  'bg-amber-100 text-amber-700',
  'bg-slate-200 text-slate-600',
  'bg-orange-100 text-orange-700',
  'bg-slate-100 text-slate-500',
  'bg-slate-100 text-slate-500',
];

// ลำดับ stage ของ pipeline ผู้สมัคร (backend ส่งมาแบบ grouping ตามตัวอักษร ต้องเรียงเอง)
const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

const cardCls = 'card-lift rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const selectTriggerCls =
  'flex w-36 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-500/30';

/** หน้า executive insights — เข้าถึงได้เฉพาะ role executive เท่านั้น */
export default function ExecutivePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<ExecutiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ค่างวดที่เลือก: '' = ล่าสุดอัตโนมัติ, รูปแบบ 'yyyy-m'
  const [periodValue, setPeriodValue] = useState('');

  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';

  // ส่วนดึงข้อมูล: โหลดรายงานตามงวดที่เลือก (executive เท่านั้น)
  const load = useCallback(
    async (selected: string) => {
      if (user?.role !== 'executive') return;
      setError(null);
      setData(null);
      try {
        const [yearStr, monthStr] = selected.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const stats =
          year && month ? await api.getExecutive(year, month) : await api.getExecutive();
        setData(stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      }
    },
    [user]
  );

  useEffect(() => {
    load(periodValue);
  }, [load, periodValue]);

  // ตัวเลือกงวดย้อนหลัง 24 เดือนจากเดือนปัจจุบัน (ใหม่สุดก่อน)
  const periodOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleDateString(locale, { year: 'numeric', month: 'short' }) };
    });
  }, [locale]);

  // ผู้ที่ไม่ใช่ executive เห็นแค่ข้อความ "ข้อมูลลับ"
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

  // ตัวช่วยจัดรูปแบบ: ย่อเงินเป็นหลักพัน และ tooltip เป็นรูปเงินบาท
  const kFormat = (v: unknown) => `${Math.round(Number(v) / 1000)}k`;
  const moneyTooltip = (value: unknown): [string, string] => [formatMoney(Number(value), locale), ''];

  // ส่งออกรายงานเป็น CSV (ฝัง BOM ให้ Excel อ่านไทยได้) — รวม KPI, แนวโน้ม, สุขภาพแผนก, ช่วงเงินเดือน
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push([esc('Period'), esc(data.period ? `${data.period.year}-${String(data.period.month).padStart(2, '0')}` : '-')].join(','));
    lines.push('');
    lines.push(['Section', 'Metric', 'Value'].map(esc).join(','));
    lines.push(['KPI', 'Monthly gross', data.latestCost?.gross ?? '-'].map(esc).join(','));
    lines.push(['KPI', 'Annual estimate', data.latestCost ? data.latestCost.gross * 12 : '-'].map(esc).join(','));
    lines.push(['KPI', 'Avg salary', data.headcount.avgSalary ?? '-'].map(esc).join(','));
    lines.push(['KPI', 'Active employees', `${data.headcount.active}/${data.headcount.total}`].map(esc).join(','));
    lines.push(['Workforce', 'Hired this year', data.workforce.hiredThisYear].map(esc).join(','));
    lines.push(['Workforce', 'Terminated (all-time)', data.workforce.terminated].map(esc).join(','));
    lines.push(['Workforce', 'Retention rate %', data.workforce.retentionRate].map(esc).join(','));
    lines.push(['Workforce', 'Open positions', `${data.workforce.openPositions}/${data.workforce.openHeadcount}`].map(esc).join(','));
    lines.push('');
    lines.push(['Month', 'Gross', 'Net'].map(esc).join(','));
    data.costTrend.forEach((m) => lines.push([m.month, m.gross, m.net].map(esc).join(',')));
    lines.push('');
    lines.push(['Department', 'Employees', 'Leave days/person', 'Late %', 'OT %'].map(esc).join(','));
    data.departmentHealth.forEach((d) =>
      lines.push([d.department, d.activeEmployees, d.leaveDaysPerEmployee ?? '-', d.lateRate ?? '-', d.otRatio ?? '-'].map(esc).join(','))
    );
    lines.push('');
    lines.push(['Department', 'Min salary', 'Median salary', 'Max salary'].map(esc).join(','));
    data.salarySpread.forEach((s) => lines.push([s.department, s.min, s.median, s.max].map(esc).join(',')));
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-report-${data.period ? `${data.period.year}-${String(data.period.month).padStart(2, '0')}` : 'latest'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // สีตัวเลขสุขภาพแผนก: เกินเกณฑ์ = เหลือง/แดง, ปกติ = เขียว, ไม่มีข้อมูล = เทา
  const lateCls = (rate: number | null) =>
    rate == null ? 'text-slate-400' : rate >= 20 ? 'font-semibold text-red-600' : rate >= 10 ? 'font-semibold text-amber-600' : 'text-emerald-600';
  const otCls = (ratio: number | null) =>
    ratio == null ? 'text-slate-400' : ratio >= 15 ? 'font-semibold text-amber-600' : 'text-emerald-600';
  const leaveCls = (days: number | null) =>
    days == null ? 'text-slate-400' : days >= 10 ? 'font-semibold text-amber-600' : 'text-slate-700';

  // KPI 4 การ์ด: ต้นทุนเดือนที่เลือก, ประมาณการรายปี, เงินเดือนเฉลี่ย, พนักงานปกติ/ทั้งหมด
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
      value: data.headcount.avgSalary == null ? '-' : formatMoney(data.headcount.avgSalary, locale),
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

  // KPI กำลังคน 4 การ์ด: จ้างใหม่ปีนี้, ลาออกสะสม, อัตราคงอยู่, ตำแหน่งเปิดรับ
  const workforceKpis: { icon: React.ReactNode; bg: string; label: string; value: React.ReactNode; sub: string }[] = [
    {
      icon: <UserPlus2 className="h-5 w-5 text-sky-600" />,
      bg: 'bg-sky-50',
      label: t('executive.hiredThisYear'),
      value: data.workforce.hiredThisYear,
      sub: '',
    },
    {
      icon: <UserMinus className="h-5 w-5 text-rose-500" />,
      bg: 'bg-rose-50',
      label: t('executive.terminated'),
      value: data.workforce.terminated,
      sub: '',
    },
    {
      icon: <HeartPulse className="h-5 w-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      label: t('executive.retention'),
      value: `${data.workforce.retentionRate}%`,
      sub: '',
    },
    {
      icon: <Briefcase className="h-5 w-5 text-amber-600" />,
      bg: 'bg-amber-50',
      label: t('executive.openPositions'),
      value: data.workforce.openHeadcount,
      sub: `${data.workforce.openPositions} ${t('executive.positionsUnit')} / ${data.workforce.openHeadcount} ${t('executive.seatsUnit')}`,
    },
  ];

  // เรียง stage ผู้สมัครตาม pipeline + แปลชื่อ stage ตามภาษา
  const pipelineData = STAGE_ORDER.map((stage) => ({
    stage: t(`recruitment.status.${stage}`, { defaultValue: stage }),
    count: data.applicantsByStage.find((s) => s.status === stage)?.count ?? 0,
  }));

  return (
    <section>
      {/* ส่วนหัวหน้าพร้อมป้าย "ข้อมูลลับ" + เลือกงวด + ปุ่มส่งออก CSV */}
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
        <div className="flex items-center gap-2">
          <Select.Root value={periodValue} onValueChange={setPeriodValue}>
            <Select.Trigger className={selectTriggerCls} aria-label={t('executive.period')}>
              <Select.Value placeholder={t('executive.periodLatest')} />
              <Select.Icon className="text-slate-400">&#9662;</Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={4}
                className="select-content z-[60] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
              >
                <Select.Viewport>
                  <Select.Item
                    value=""
                    className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-azure-700 data-[highlighted]:bg-azure-50"
                  >
                    <Select.ItemText>{t('executive.periodLatest')}</Select.ItemText>
                  </Select.Item>
                  {periodOptions.map((p) => (
                    <Select.Item
                      key={p.value}
                      value={p.value}
                      className="cursor-pointer rounded-md px-3 py-2 text-sm data-[highlighted]:bg-azure-50 data-[highlighted]:text-azure-700"
                    >
                      <Select.ItemText>{p.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-azure-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-azure-500/25 transition hover:-translate-y-0.5"
          >
            <Download className="h-4 w-4" />
            {t('executive.exportCsv')}
          </button>
        </div>
      </div>

      {/* ส่วนการ์ด KPI ต้นทุน */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cardCls}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{k.label}</span>
              <span className={`rounded-lg p-2 ${k.bg}`}>{k.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{k.value}</div>
            {k.sub && <div className="mt-0.5 text-xs text-slate-400">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ส่วนการ์ด KPI กำลังคนและการสรรหา */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {workforceKpis.map((k) => (
          <div key={k.label} className={cardCls}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{k.label}</span>
              <span className={`rounded-lg p-2 ${k.bg}`}>{k.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{k.value}</div>
            {k.sub && <div className="mt-0.5 text-xs text-slate-400">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* กราฟเส้น: แนวโน้มต้นทุนค่าจ้างย้อนหลัง 12 เดือน (gross + net) */}
      <div className={`mb-6 ${cardCls}`}>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">{t('executive.costTrend')}</h3>
        {data.costTrend.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">{t('executive.noPayroll')}</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.costTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickFormatter={kFormat} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip formatter={moneyTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="gross" name={t('executive.grossShort')} stroke="#0284C7" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name={t('executive.netShort')} stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* แถวสุขภาพองค์กร: ตารางสุขภาพแผนก + กราฟช่วงเงินเดือน */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className={cardCls}>
          <h3 className="mb-4 text-sm font-semibold text-slate-700">{t('executive.deptHealth')}</h3>
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3">{t('departments.title')}</th>
                <th className="pb-2 pr-3 text-right">{t('executive.employeesCol')}</th>
                <th className="pb-2 pr-3 text-right">{t('executive.leavePerEmp')}</th>
                <th className="pb-2 pr-3 text-right">{t('executive.lateRate')}</th>
                <th className="pb-2 text-right">{t('executive.otRatio')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.departmentHealth.map((d) => (
                <tr key={d.department}>
                  <td className="py-2.5 pr-3 font-medium text-slate-900">{d.department}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{d.activeEmployees}</td>
                  <td className={`py-2.5 pr-3 text-right ${leaveCls(d.leaveDaysPerEmployee)}`}>
                    {d.leaveDaysPerEmployee ?? '-'}
                  </td>
                  <td className={`py-2.5 pr-3 text-right ${lateCls(d.lateRate)}`}>
                    {d.lateRate == null ? '-' : `${d.lateRate}%`}
                  </td>
                  <td className={`py-2.5 text-right ${otCls(d.otRatio)}`}>
                    {d.otRatio == null ? '-' : `${d.otRatio}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* กราฟแท่ง 3 ชั้น: เงินเดือนต่ำสุด/กลาง/สูงสุดของแต่ละแผนก */}
        <div className={cardCls}>
          <h3 className="mb-4 text-sm font-semibold text-slate-700">{t('executive.salarySpread')}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salarySpread} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tickFormatter={kFormat} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip formatter={moneyTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="min" name={t('executive.minSalary')} fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="median" name={t('executive.medianSalary')} fill="#0284C7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="max" name={t('executive.maxSalary')} fill="#7DD3FC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* กราฟแท่งแนวนอน: จำนวนผู้สมัครแยกตาม stage ของ pipeline */}
      <div className={`mb-6 ${cardCls}`}>
        <h3 className="mb-4 text-sm font-semibold text-slate-700">{t('executive.pipeline')}</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF8" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis type="category" dataKey="stage" width={90} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip />
              <Bar dataKey="count" name={t('executive.applicants')} fill="#7C3AED" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* แถวเดิม: กราฟเงินเดือนเฉลี่ยตามแผนก + ตาราง Top earners */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={cardCls}>
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

        {/* ตารางพนักงานเงินเดือนสูงสุด 5 อันดับ */}
        <div className={cardCls}>
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
