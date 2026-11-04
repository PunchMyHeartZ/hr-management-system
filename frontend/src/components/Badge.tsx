import { useTranslation } from 'react-i18next';

const STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  terminated: 'bg-red-50 text-red-700 ring-red-600/20',
};

const LABEL_KEYS: Record<string, string> = {
  active: 'employees.status.active',
  inactive: 'employees.status.inactive',
  terminated: 'employees.status.terminated',
  pending: 'leaves.status.pending',
  approved: 'leaves.status.approved',
  rejected: 'leaves.status.rejected',
};

export default function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        STYLES[status] ?? STYLES.inactive
      }`}
    >
      {t(LABEL_KEYS[status] ?? status)}
    </span>
  );
}
