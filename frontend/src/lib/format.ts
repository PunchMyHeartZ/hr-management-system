export function formatDate(isoDate: string | null | undefined, locale = 'en-US'): string {
  if (!isoDate) return '-';
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(value: number | null | undefined, locale = 'en-US'): string {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number(value));
}
