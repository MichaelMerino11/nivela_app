import { getPlanningSummary } from '@/services/planning'

import { getBudgetOverview, type BudgetStatus } from '@/services/budgets'

export type PurchaseDecision = 'yes' | 'careful' | 'no'

export interface PurchaseAdvice {
  decision: PurchaseDecision

  amountCents: number

  currentAvailableCents: number
  availableAfterPurchaseCents: number

  currentRiskScore: number

  message: string

  categoryId: string | null
  categoryName: string | null

  hasCategoryBudget: boolean

  budgetLimitCents: number | null
  budgetSpentCents: number | null
  budgetAfterPurchaseCents: number | null
  budgetRemainingAfterPurchaseCents: number | null

  budgetPercentageAfterPurchase: number | null

  budgetStatusAfterPurchase: BudgetStatus | null
}

export async function canIBuy(
  amountCents: number,
  categoryId?: string | null,
): Promise<PurchaseAdvice> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('El monto debe ser mayor que cero.')
  }

  const [summary, budgetOverview] = await Promise.all([getPlanningSummary(), getBudgetOverview()])

  const currentAvailableCents = summary.distributableCents

  const availableAfterPurchaseCents = currentAvailableCents - amountCents

  /*
   * Presupuesto de la categoría,
   * si el usuario seleccionó una.
   */
  const category = categoryId
    ? budgetOverview.categories.find((item) => item.categoryId === categoryId)
    : undefined

  const hasCategoryBudget = Boolean(category && category.limitCents !== null)

  const budgetLimitCents = hasCategoryBudget ? category!.limitCents : null

  const budgetSpentCents = hasCategoryBudget ? category!.spentCents : null

  const budgetAfterPurchaseCents = hasCategoryBudget ? category!.spentCents + amountCents : null

  const budgetRemainingAfterPurchaseCents =
    hasCategoryBudget && budgetLimitCents !== null && budgetAfterPurchaseCents !== null
      ? budgetLimitCents - budgetAfterPurchaseCents
      : null

  let budgetPercentageAfterPurchase: number | null = null

  let budgetStatusAfterPurchase: BudgetStatus | null = null

  if (
    hasCategoryBudget &&
    category &&
    budgetLimitCents !== null &&
    budgetAfterPurchaseCents !== null
  ) {
    if (budgetLimitCents > 0) {
      budgetPercentageAfterPurchase = Math.round(
        (budgetAfterPurchaseCents / budgetLimitCents) * 100,
      )
    } else {
      budgetPercentageAfterPurchase = budgetAfterPurchaseCents > 0 ? 100 : 0
    }

    if (budgetAfterPurchaseCents > budgetLimitCents) {
      budgetStatusAfterPurchase = 'exceeded'
    } else if (budgetPercentageAfterPurchase >= category.warningPercentage) {
      budgetStatusAfterPurchase = 'warning'
    } else {
      budgetStatusAfterPurchase = 'normal'
    }
  }

  const baseResult = {
    amountCents,

    currentAvailableCents,
    availableAfterPurchaseCents,

    currentRiskScore: summary.riskScore,

    categoryId: category?.categoryId ?? null,

    categoryName: category?.categoryName ?? null,

    hasCategoryBudget,

    budgetLimitCents,
    budgetSpentCents,
    budgetAfterPurchaseCents,
    budgetRemainingAfterPurchaseCents,
    budgetPercentageAfterPurchase,
    budgetStatusAfterPurchase,
  }

  /*
   * Primero protegemos la situación
   * financiera global.
   */
  if (summary.riskLevel === 'high') {
    return {
      ...baseResult,

      decision: 'no',

      message:
        'Tu situación actual ya está en riesgo alto. Nivela recomienda posponer esta compra.',
    }
  }

  if (availableAfterPurchaseCents < 0) {
    return {
      ...baseResult,

      decision: 'no',

      message:
        'Esta compra dejaría tu dinero tranquilo en negativo y comprometería tu planificación actual.',
    }
  }

  /*
   * Después comprobamos el presupuesto
   * específico de la categoría.
   */
  if (budgetStatusAfterPurchase === 'exceeded' && category) {
    return {
      ...baseResult,

      decision: 'careful',

      message: `La compra cabe en tu situación general, pero haría que excedas el presupuesto de ${category.categoryName}.`,
    }
  }

  if (budgetStatusAfterPurchase === 'warning' && category) {
    return {
      ...baseResult,

      decision: 'careful',

      message: `Puedes hacerlo, pero quedarías cerca del límite de tu presupuesto de ${category.categoryName}.`,
    }
  }

  const remainingRatio =
    currentAvailableCents > 0 ? availableAfterPurchaseCents / currentAvailableCents : 0

  if (remainingRatio < 0.35 || summary.riskLevel === 'medium') {
    return {
      ...baseResult,

      decision: 'careful',

      message: 'Podrías hacerlo, pero consumirías una parte importante de tu margen disponible.',
    }
  }

  return {
    ...baseResult,

    decision: 'yes',

    message: hasCategoryBudget
      ? 'La compra cabe dentro de tu planificación y también respeta el presupuesto de la categoría.'
      : 'La compra cabe dentro de tu planificación actual. Esta categoría todavía no tiene un presupuesto configurado.',
  }
}