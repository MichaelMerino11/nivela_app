import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPlanningSummary } from '@/services/planning'

import { getBudgetOverview } from '@/services/budgets'

import { canIBuy } from '@/services/purchase-advisor'

vi.mock('@/services/planning', () => ({
  getPlanningSummary: vi.fn(),
}))

vi.mock('@/services/budgets', () => ({
  getBudgetOverview: vi.fn(),
}))

const planningMock = vi.mocked(getPlanningSummary)

const budgetsMock = vi.mocked(getBudgetOverview)

function mockPlanning(overrides: Record<string, unknown> = {}) {
  planningMock.mockResolvedValue({
    cycleId: 'cycle-1',
    cycleStartDate: '2026-09-01',
    cycleEndDate: '2026-09-30',
    snapshotDate: '2026-09-01',

    currentBalanceCents: 50000,
    savingsTargetCents: 10000,

    upcomingCommitmentsCents: 0,
    variableReserveCents: 0,
    upcomingPlannedExpensesCents: 0,

    necessaryVariableCents: 0,
    adjustableVariableCents: 0,

    distributableCents: 10000,
    essentialDistributableCents: 10000,

    routineNeedCents: 5000,

    daysRemaining: 10,
    dailyAverageCents: 1000,
    projectedSurplusCents: 5000,

    riskScore: 14,
    riskLevel: 'low',

    nextDays: [],
    dailyPlan: [],

    spentTodayCents: 0,

    ...overrides,
  } as Awaited<ReturnType<typeof getPlanningSummary>>)
}

function mockBudgets(
  categories: Array<{
    categoryId: string
    categoryName: string
    limitCents: number | null
    spentCents: number
    warningPercentage: number
  }> = [],
) {
  budgetsMock.mockResolvedValue({
    categories,
  } as Awaited<ReturnType<typeof getBudgetOverview>>)
}

describe('canIBuy', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockPlanning()
    mockBudgets()
  })

  it('rechaza montos inválidos', async () => {
    await expect(canIBuy(0)).rejects.toThrow('El monto debe ser mayor que cero.')

    expect(planningMock).not.toHaveBeenCalled()

    expect(budgetsMock).not.toHaveBeenCalled()
  })

  it('responde yes cuando la compra es saludable', async () => {
    mockBudgets([
      {
        categoryId: 'comida',
        categoryName: 'Comida',
        limitCents: 10000,
        spentCents: 1000,
        warningPercentage: 80,
      },
    ])

    const result = await canIBuy(1000, 'comida')

    expect(result.decision).toBe('yes')

    expect(result.availableAfterPurchaseCents).toBe(9000)

    expect(result.budgetAfterPurchaseCents).toBe(2000)

    expect(result.budgetStatusAfterPurchase).toBe('normal')
  })

  it('responde no cuando el riesgo global ya es alto', async () => {
    mockPlanning({
      riskScore: 95,
      riskLevel: 'high',
    })

    const result = await canIBuy(1000)

    expect(result.decision).toBe('no')

    expect(result.message).toContain('riesgo alto')
  })

  it('responde no si la compra deja el dinero disponible en negativo', async () => {
    mockPlanning({
      distributableCents: 500,
      essentialDistributableCents: 5000,
      riskScore: 14,
      riskLevel: 'low',
    })

    const result = await canIBuy(600)

    expect(result.decision).toBe('no')

    expect(result.availableAfterPurchaseCents).toBe(-100)
  })

  it('responde careful cuando el riesgo global es medio', async () => {
    mockPlanning({
      distributableCents: 10000,
      essentialDistributableCents: 10000,
      riskScore: 48,
      riskLevel: 'medium',
    })

    const result = await canIBuy(1000)

    expect(result.decision).toBe('careful')
  })

  it('responde careful cuando la compra alcanza la advertencia del presupuesto', async () => {
    mockBudgets([
      {
        categoryId: 'comida',
        categoryName: 'Comida',
        limitCents: 10000,
        spentCents: 7000,
        warningPercentage: 80,
      },
    ])

    const result = await canIBuy(1000, 'comida')

    expect(result.decision).toBe('careful')

    expect(result.budgetPercentageAfterPurchase).toBe(80)

    expect(result.budgetStatusAfterPurchase).toBe('warning')
  })

  it('responde careful cuando la compra excede el presupuesto', async () => {
    mockBudgets([
      {
        categoryId: 'comida',
        categoryName: 'Comida',
        limitCents: 10000,
        spentCents: 9500,
        warningPercentage: 80,
      },
    ])

    const result = await canIBuy(1000, 'comida')

    expect(result.decision).toBe('careful')

    expect(result.budgetAfterPurchaseCents).toBe(10500)

    expect(result.budgetRemainingAfterPurchaseCents).toBe(-500)

    expect(result.budgetStatusAfterPurchase).toBe('exceeded')
  })

  it('responde careful si la compra consume más del 65% del margen', async () => {
    mockPlanning({
      distributableCents: 10000,
      essentialDistributableCents: 10000,
      riskScore: 14,
      riskLevel: 'low',
    })

    const result = await canIBuy(7000)

    expect(result.decision).toBe('careful')

    expect(result.availableAfterPurchaseCents).toBe(3000)
  })
})