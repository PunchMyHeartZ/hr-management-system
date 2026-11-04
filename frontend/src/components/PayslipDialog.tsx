import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '../api/client';
import type { Employee, PayrollRecord } from '../api/schemas';
import { formatMoney } from '../lib/format';
import { btnSecondary } from '../lib/ui';

interface PayslipDialogProps {
  record: PayrollRecord | null;
  employee?: Employee | null;
  onClose: () => void;
}

export default function PayslipDialog({ record, employee, onClose }: PayslipDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
  const [emp, setEmp] = useState<Employee | null>(employee ?? null);

  useEffect(() => {
    if (employee || !record) {
      setEmp(employee ?? null);
      return;
    }
    let cancelled = false;
    api
      .getEmployee(record.employee_id)
      .then((fetched) => {
        if (!cancelled) setEmp(fetched);
      })
      .catch(() => {
        if (!cancelled) setEmp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [record, employee]);

  const period = record
    ? `${record.pay_period_year}-${String(record.pay_period_month).padStart(2, '0')}`
    : '';
  const gross = record ? record.base_salary + record.ot_pay + record.bonus : 0;

  return (
    <Dialog.Root open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-0 shadow-xl focus:outline-none">
          <div id="payslip-print" className="p-8 print:p-0">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div>
                <div className="text-lg font-extrabold text-slate-900">HR Management System</div>
                <div className="text-xs text-slate-500">{t('payslip.title')} · {period}</div>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-sky-400 to-azure-600 px-3 py-2 text-xs font-bold text-white">
                {t('payslip.period')}: {period}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('payslip.employee')}</div>
                <div className="mt-0.5 font-semibold text-slate-900">{record?.employee_name}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('payslip.position')}</div>
                <div className="mt-0.5 text-slate-700">{emp?.position ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('payslip.department')}</div>
                <div className="mt-0.5 text-slate-700">{emp?.department_name ?? '-'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">ID</div>
                <div className="mt-0.5 text-slate-700">#{record?.employee_id}</div>
              </div>
            </div>

            <div className="space-y-2 py-4 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>{t('payslip.baseSalary')}</span>
                <span className="font-medium">{formatMoney(record?.base_salary, locale)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{t('payslip.otHours')} ({Number(record?.ot_hours ?? 0).toFixed(1)} h)</span>
                <span className="font-medium">{formatMoney(record?.ot_pay, locale)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{t('payslip.bonus')}</span>
                <span className="font-medium">{formatMoney(record?.bonus, locale)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>{t('payslip.gross')}</span>
                <span>{formatMoney(gross, locale)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>{t('payslip.sso')}</span>
                <span>-{formatMoney(record?.sso, locale)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>{t('payslip.tax')}</span>
                <span>-{formatMoney(record?.tax, locale)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-azure-50 px-3 py-2.5 text-base font-bold text-azure-800">
                <span>{t('payslip.netPay')}</span>
                <span>{formatMoney(record?.net_pay, locale)}</span>
              </div>
            </div>

            <p className="border-t border-slate-200 pt-3 text-[11px] text-slate-400">{t('payslip.note')}</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 p-4 print:hidden">
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {t('common.cancel')}
              </button>
            </Dialog.Close>
            <button type="button" onClick={() => window.print()} className={btnSecondary}>
              {t('payslip.print')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
