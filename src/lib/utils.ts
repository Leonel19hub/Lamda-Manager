export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '$ 0,00'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('ARS', '$').trim()
}

export function formatNumber(n: number, decimals = 2): string {
  if (isNaN(n) || !isFinite(n)) return '0'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatWeight(kg: number): string {
  return `${formatNumber(kg, 3)} kg`
}

export function formatDate(date: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatTime(date: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDateTime(date: string): string {
  const formattedDate = formatDate(date)
  const formattedTime = formatTime(date)
  if (!formattedDate) return ''
  return `${formattedDate} ${formattedTime}`
}

export function generateId(): string {
  return crypto.randomUUID()
}
