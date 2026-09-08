export function moneyToCents(value: string): number {
  let normalized = value.trim().replace(/\$/g, '').replace(/\s/g, '')

  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',')
    const lastDot = normalized.lastIndexOf('.')

    if (lastComma > lastDot) {
      // 1.250,50
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,250.50
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    // 1250,50
    normalized = normalized.replace(',', '.')
  }

  const amount = Number(normalized)

  if (!Number.isFinite(amount)) {
    throw new Error('Monto inválido')
  }

  return Math.round(amount * 100)
}

export function centsToCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}