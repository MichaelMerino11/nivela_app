import { getPlanningSummary } from '@/services/planning'

export type PurchaseDecision = 'yes' | 'careful' | 'no'

export interface PurchaseAdvice {
  decision: PurchaseDecision

  amountCents: number

  currentAvailableCents: number
  availableAfterPurchaseCents: number

  currentRiskScore: number

  message: string
}

export async function canIBuy(amountCents: number): Promise<PurchaseAdvice> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('El monto debe ser mayor que cero.')
  }

  const summary = await getPlanningSummary()

  const currentAvailableCents = summary.distributableCents

  const availableAfterPurchaseCents = currentAvailableCents - amountCents

  /*
   * Si Nivela ya detecta riesgo alto,
   * no recomendamos agregar una compra
   * nueva aunque matemáticamente todavía
   * exista algo de margen.
   */
  if (summary.riskLevel === 'high') {
    return {
      decision: 'no',

      amountCents,

      currentAvailableCents,

      availableAfterPurchaseCents,

      currentRiskScore: summary.riskScore,

      message:
        'Tu situación actual ya está en riesgo alto. Nivela recomienda posponer esta compra.',
    }
  }

  /*
   * La compra llevaría el dinero
   * tranquilo a negativo.
   */
  if (availableAfterPurchaseCents < 0) {
    return {
      decision: 'no',

      amountCents,

      currentAvailableCents,

      availableAfterPurchaseCents,

      currentRiskScore: summary.riskScore,

      message:
        'Esta compra dejaría tu dinero tranquilo en negativo y comprometería tu planificación actual.',
    }
  }

  const remainingRatio =
    currentAvailableCents > 0 ? availableAfterPurchaseCents / currentAvailableCents : 0

  /*
   * Todavía es posible, pero consumiría
   * demasiado margen.
   */
  if (remainingRatio < 0.35 || summary.riskLevel === 'medium') {
    return {
      decision: 'careful',

      amountCents,

      currentAvailableCents,

      availableAfterPurchaseCents,

      currentRiskScore: summary.riskScore,

      message: 'Podrías hacerlo, pero consumirías una parte importante de tu margen disponible.',
    }
  }

  return {
    decision: 'yes',

    amountCents,

    currentAvailableCents,

    availableAfterPurchaseCents,

    currentRiskScore: summary.riskScore,

    message:
      'La compra cabe dentro de tu planificación actual sin comprometer el dinero que ya protegiste.',
  }
}