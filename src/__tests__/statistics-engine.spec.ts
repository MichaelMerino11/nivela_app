import { describe, expect, it } from 'vitest'

import {
  calculateExpenseStatistics,
  calculatePlannedStatistics,
  type StatisticsExpenseInput,
} from '@/services/statistics-engine'

const expenses: StatisticsExpenseInput[] = [
  {
    categoryId: 'comida',
    categoryName: 'Comida',
    categoryColor: '#000000',
    amountCents: 1000,
    occurredAt: '2026-09-01T12:00:00',
    plannedExpenseId: null,
  },
  {
    categoryId: 'transporte',
    categoryName: 'Transporte',
    categoryColor: '#111111',
    amountCents: 500,
    occurredAt: '2026-09-02T12:00:00',
    plannedExpenseId: null,
  },
  {
    categoryId: 'comida',
    categoryName: 'Comida',
    categoryColor: '#000000',
    amountCents: 500,
    occurredAt: '2026-09-03T12:00:00',
    plannedExpenseId: null,
  },
]

describe('calculateExpenseStatistics', () => {
  it('calcula total, cantidad y promedio usando todos los días transcurridos', () => {
    const result = calculateExpenseStatistics(
      '2026-09-01',
      '2026-09-10',
      expenses,
      new Date(2026, 8, 3),
    )

    expect(result.totalSpentCents).toBe(2000)

    expect(result.expenseCount).toBe(3)

    expect(result.elapsedDays).toBe(3)

    expect(result.dailyAverageCents).toBe(667)
  })

  it('agrupa correctamente por categoría', () => {
    const result = calculateExpenseStatistics(
      '2026-09-01',
      '2026-09-10',
      expenses,
      new Date(2026, 8, 3),
    )

    expect(result.categories).toHaveLength(2)

    expect(result.categories[0]).toMatchObject({
      categoryId: 'comida',
      categoryName: 'Comida',
      totalCents: 1500,
      percentage: 75,
    })

    expect(result.categories[1]).toMatchObject({
      categoryId: 'transporte',
      categoryName: 'Transporte',
      totalCents: 500,
      percentage: 25,
    })
  })

  it('identifica la categoría con mayor gasto', () => {
    const result = calculateExpenseStatistics(
      '2026-09-01',
      '2026-09-10',
      expenses,
      new Date(2026, 8, 3),
    )

    expect(result.topCategory).toEqual({
      categoryId: 'comida',
      categoryName: 'Comida',
      totalCents: 1500,
    })
  })

  it('construye correctamente la evolución acumulada', () => {
    const result = calculateExpenseStatistics(
      '2026-09-01',
      '2026-09-10',
      expenses,
      new Date(2026, 8, 3),
    )

    expect(result.daily).toEqual([
      {
        date: '2026-09-01',
        spentCents: 1000,
        cumulativeCents: 1000,
      },
      {
        date: '2026-09-02',
        spentCents: 500,
        cumulativeCents: 1500,
      },
      {
        date: '2026-09-03',
        spentCents: 500,
        cumulativeCents: 2000,
      },
    ])
  })

  it('maneja correctamente un ciclo sin gastos', () => {
    const result = calculateExpenseStatistics('2026-09-01', '2026-09-10', [], new Date(2026, 8, 3))

    expect(result.totalSpentCents).toBe(0)

    expect(result.expenseCount).toBe(0)

    expect(result.dailyAverageCents).toBe(0)

    expect(result.categories).toEqual([])

    expect(result.topCategory).toBeNull()
  })
})

describe('calculatePlannedStatistics', () => {
  it('compara correctamente lo planeado contra lo realmente gastado', () => {
    const transactions: StatisticsExpenseInput[] = [
      {
        categoryId: 'salud',
        categoryName: 'Salud',
        categoryColor: null,
        amountCents: 1000,
        occurredAt: '2026-09-01T12:00:00',
        plannedExpenseId: 'plan-1',
      },
      {
        categoryId: 'salud',
        categoryName: 'Salud',
        categoryColor: null,
        amountCents: 200,
        occurredAt: '2026-09-01T14:00:00',
        plannedExpenseId: 'plan-1',
      },
      {
        categoryId: 'hogar',
        categoryName: 'Hogar',
        categoryColor: null,
        amountCents: 500,
        occurredAt: '2026-09-02T12:00:00',
        plannedExpenseId: 'plan-2',
      },
    ]

    const result = calculatePlannedStatistics(transactions, [
      {
        id: 'plan-1',
        amountCents: 1500,
      },
      {
        id: 'plan-2',
        amountCents: 600,
      },
    ])

    expect(result).toEqual({
      completedCount: 2,
      totalPlannedCents: 2100,
      totalActualCents: 1700,
      differenceCents: 400,
    })
  })
})
