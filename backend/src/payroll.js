// Thai payroll calculation (simplified estimate)
// - SSO: 5% of salary, capped at 750 THB/month
// - OT: hourly rate = salary / 30 / 8, paid at 1.5x
// - Tax: monthly withholding from Thai progressive brackets, using
//   50% expense deduction (max 100,000), 60,000 personal allowance,
//   and SSO contributions as deductions. Annual bonus is withheld once
//   (in the month paid) at the employee's marginal rate.
//   This is an ESTIMATE, not official RD calculation.

const SSO_RATE = 0.05;
const SSO_MAX = 750;
const OT_MULTIPLIER = 1.5;

const TAX_BRACKETS = [
  { upTo: 150000, rate: 0 },
  { upTo: 300000, rate: 0.05 },
  { upTo: 500000, rate: 0.1 },
  { upTo: 750000, rate: 0.15 },
  { upTo: 1000000, rate: 0.2 },
  { upTo: 2000000, rate: 0.25 },
  { upTo: 5000000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

// Marginal rate: the tax rate of the bracket the taxable income falls into
function marginalRateFor(taxableIncome) {
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.upTo) return b.rate;
  }
  return TAX_BRACKETS[TAX_BRACKETS.length - 1].rate;
}

const round2 = (n) => Math.round(n * 100) / 100;

function annualIncomeTax(taxableIncome) {
  let tax = 0;
  let prev = 0;
  for (const b of TAX_BRACKETS) {
    if (taxableIncome > b.upTo) {
      tax += (b.upTo - prev) * b.rate;
      prev = b.upTo;
    } else {
      tax += (taxableIncome - prev) * b.rate;
      break;
    }
  }
  return Math.max(0, Math.round(tax));
}

function computeMonthlyPayroll({ salary, otHours = 0, annualBonus = 0 }) {
  const hourlyRate = salary / 30 / 8;
  const otPay = round2(otHours * hourlyRate * OT_MULTIPLIER);
  const sso = round2(Math.min(salary * SSO_RATE, SSO_MAX));

  // Regular income (salary + OT) taxed via annual progressive brackets
  const annualRegular = salary * 12 + otPay * 12;
  const expenseDeduction = Math.min(annualRegular * 0.5, 100000);
  const personalAllowance = 60000;
  const taxableRegular = Math.max(
    0,
    annualRegular - expenseDeduction - personalAllowance - sso * 12
  );
  const regularMonthlyTax = annualIncomeTax(taxableRegular) / 12;

  // Bonus is withheld once, in the month it is paid, at the marginal rate
  const bonusTax = Math.round(annualBonus * marginalRateFor(taxableRegular));

  const tax = round2(regularMonthlyTax + bonusTax);

  const gross = salary + otPay + annualBonus;
  const netPay = round2(gross - sso - tax);

  return { otPay, sso, tax, netPay, hourlyRate: round2(hourlyRate) };
}

module.exports = {
  computeMonthlyPayroll,
  SSO_RATE,
  SSO_MAX,
  OT_MULTIPLIER,
};
