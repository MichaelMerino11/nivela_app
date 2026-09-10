import { describe, expect, it } from 'vitest'

import { calculateSavingsProgress } from '@/services/savings-engine'

describe('calculateSavingsProgress', () => {
  it('calcula correctamente el progreso parcial', () => {
    const result = calculateSavingsProgress(10000, [
      {
        amountCents: 2500,
      },
      {
        amountCents: 1500,
      },
    ])

    expect(result).toEqual({
      savedCents: 4000,
      remainingCents: 6000,
      exceededCents: 0,
      progressPercentage: 40,
    })
  })

  it('marca la meta como completada al llegar exactamente al objetivo', () => {
    const result = calculateSavingsProgress(10000, [
      {
        amountCents: 6000,
      },
      {
        amountCents: 4000,
      },
    ])

    expect(result).toEqual({
      savedCents: 10000,
      remainingCents: 0,
      exceededCents: 0,
      progressPercentage: 100,
    })
  })

  it('calcula cuánto se superó la meta', () => {
    const result = calculateSavingsProgress(10000, [
      {
        amountCents: 7000,
      },
      {
        amountCents: 5000,
      },
    ])

    expect(result).toEqual({
      savedCents: 12000,
      remainingCents: 0,
      exceededCents: 2000,
      progressPercentage: 120,
    })
  })

  it('mantiene todo en cero cuando todavía no existen aportes', () => {
    const result = calculateSavingsProgress(10000, [])

    expect(result).toEqual({
      savedCents: 0,
      remainingCents: 10000,
      exceededCents: 0,
      progressPercentage: 0,
    })
  })

  it('maneja una meta de ahorro igual a cero', () => {
    const result = calculateSavingsProgress(0, [])

    expect(result).toEqual({
      savedCents: 0,
      remainingCents: 0,
      exceededCents: 0,
      progressPercentage: 0,
    })
  })
})