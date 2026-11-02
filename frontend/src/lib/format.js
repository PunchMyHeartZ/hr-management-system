export function formatDate(isoDate, locale = 'en-US') {
  if (!isoDate) return '-';
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(value, locale = 'en-US') {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number(value));
}
