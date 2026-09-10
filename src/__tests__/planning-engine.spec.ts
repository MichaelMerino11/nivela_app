import { describe, expect, it } from 'vitest'

import { calculateDailyPlan, calculateRisk, type RoutineRule } from '@/services/planning-engine'

describe('calculateRisk', () => {
  it('marca riesgo alto si no se cubren necesidades esenciales', () => {
    const result = calculateRisk(10000, -100, 5000)

    expect(result).toEqual({
      score: 95,
      level: 'high',
    })
  })

  it('marca riesgo alto si el dinero distribuible es negativo', () => {
    const result = calculateRisk(-100, 1000, 5000)

    expect(result).toEqual({
      score: 72,
      level: 'high',
    })
  })

  it('marca riesgo bajo cuando existe holgura suficiente', () => {
    const result = calculateRisk(12500, 12500, 10000)

    expect(result).toEqual({
      score: 14,
      level: 'low',
    })
  })

  it('marca riesgo medio con cobertura del 80%', () => {
    const result = calculateRisk(8000, 8000, 10000)

    expect(result).toEqual({
      score: 48,
      level: 'medium',
    })
  })

  it('marca riesgo alto con cobertura insuficiente', () => {
    const result = calculateRisk(5000, 5000, 10000)

    expect(result).toEqual({
      score: 82,
      level: 'high',
    })
  })
})

describe('calculateDailyPlan', () => {
  const routines: RoutineRule[] = [
    {
      category_id: 'pareja',
      weekday: 4,
      title: 'Trabajo + pareja',
      normal_amount_cents: 2000,
      max_amount_cents: 3000,
    },
    {
      category_id: 'pareja',
      weekday: 5,
      title: 'Trabajo + pareja',
      normal_amount_cents: 2000,
      max_amount_cents: 3000,
    },
  ]

  const dates = [new Date(2026, 8, 10), new Date(2026, 8, 11)]

  it('mantiene la rutina cuando existe dinero suficiente y no hay presupuesto', () => {
    const result = calculateDailyPlan(dates, routines, 10000, new Map())

    expect(result[0]?.recommendedCents).toBe(2000)
    expect(result[1]?.recommendedCents).toBe(2000)

    expect(result[0]?.maximumRecommendedCents).toBe(3000)
    expect(result[1]?.maximumRecommendedCents).toBe(3000)
  })

  it('reduce proporcionalmente cuando no alcanza el dinero general', () => {
    const result = calculateDailyPlan(dates, routines, 2000, new Map())

    expect(result[0]?.recommendedCents).toBe(1000)
    expect(result[1]?.recommendedCents).toBe(1000)
  })

  it('usa el presupuesto de categoría como techo', () => {
    const budgets = new Map<string, number>([['pareja', 2500]])

    const result = calculateDailyPlan(dates, routines, 10000, budgets)

    const totalRecommended = result.reduce((total, day) => total + day.recommendedCents, 0)

    expect(totalRecommended).toBe(2500)

    expect(result[0]?.recommendedCents).toBe(1250)
    expect(result[1]?.recommendedCents).toBe(1250)
  })

  it('limita solo el máximo si el presupuesto cubre lo habitual', () => {
    const budgets = new Map<string, number>([['pareja', 5000]])

    const result = calculateDailyPlan(dates, routines, 10000, budgets)

    expect(result[0]?.recommendedCents).toBe(2000)
    expect(result[1]?.recommendedCents).toBe(2000)

    const totalMaximum = result.reduce((total, day) => total + day.maximumRecommendedCents, 0)

    expect(totalMaximum).toBe(5000)
  })
})