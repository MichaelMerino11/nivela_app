import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}))

vi.mock('@/services/supabase', () => ({
  supabase: {
    rpc: rpcMock,
  },
}))

import { rolloverFinancialCycle } from '@/services/cycle-rollover'

describe('rolloverFinancialCycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza un sueldo igual a cero', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 0,
        totalBalanceCents: 70000,
        receivedDate: '2026-09-11',
        nextPaydayDate: '2026-10-11',
        savingsTargetCents: 10000,
      }),
    ).rejects.toThrow('El sueldo recibido debe ser mayor que cero.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza un sueldo que no esté expresado en centavos enteros', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 68300.5,
        totalBalanceCents: 70000,
        receivedDate: '2026-09-11',
        nextPaydayDate: '2026-10-11',
        savingsTargetCents: 10000,
      }),
    ).rejects.toThrow('El sueldo recibido debe ser mayor que cero.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza un saldo total inválido', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 68300,
        totalBalanceCents: 70000.5,
        receivedDate: '2026-09-11',
        nextPaydayDate: '2026-10-11',
        savingsTargetCents: 10000,
      }),
    ).rejects.toThrow('El saldo total no es válido.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza una fecha de sueldo vacía', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 68300,
        totalBalanceCents: 70000,
        receivedDate: '',
        nextPaydayDate: '2026-10-11',
        savingsTargetCents: 10000,
      }),
    ).rejects.toThrow('Selecciona la fecha en que recibiste el sueldo.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza una próxima fecha de pago vacía', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 68300,
        totalBalanceCents: 70000,
        receivedDate: '2026-09-11',
        nextPaydayDate: '',
        savingsTargetCents: 10000,
      }),
    ).rejects.toThrow('Selecciona la próxima fecha de pago.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza una próxima fecha de pago anterior o igual al sueldo recibido', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 68300,
        totalBalanceCents: 70000,
        receivedDate: '2026-09-11',
        nextPaydayDate: '2026-09-11',
        savingsTargetCents: 10000,
      }),
    ).rejects.toThrow('La próxima fecha de pago debe ser posterior a la fecha actual.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza una meta de ahorro negativa', async () => {
    await expect(
      rolloverFinancialCycle({
        salaryReceivedCents: 68300,
        totalBalanceCents: 70000,
        receivedDate: '2026-09-11',
        nextPaydayDate: '2026-10-11',
        savingsTargetCents: -100,
      }),
    ).rejects.toThrow('La meta de ahorro no es válida.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('envía correctamente un cambio de ciclo válido', async () => {
    rpcMock.mockResolvedValue({
      data: {
        closed_cycle_id: 'cycle-old',
        new_cycle_id: 'cycle-new',

        closing_balance_cents: 1700,
        opening_balance_cents: 70000,

        salary_received_cents: 68300,

        new_start_date: '2026-09-11',
        new_end_date: '2026-10-10',
        next_payday_date: '2026-10-11',

        savings_target_cents: 10000,
      },

      error: null,
    })

    const result = await rolloverFinancialCycle({
      salaryReceivedCents: 68300,
      totalBalanceCents: 70000,
      receivedDate: '2026-09-11',
      nextPaydayDate: '2026-10-11',
      savingsTargetCents: 10000,
    })

    expect(rpcMock).toHaveBeenCalledTimes(1)

    expect(rpcMock).toHaveBeenCalledWith('rollover_financial_cycle', {
      p_salary_received_cents: 68300,
      p_total_balance_cents: 70000,
      p_received_date: '2026-09-11',
      p_next_payday_date: '2026-10-11',
      p_savings_target_cents: 10000,
    })

    expect(result.new_cycle_id).toBe('cycle-new')

    expect(result.closing_balance_cents).toBe(1700)

    expect(result.opening_balance_cents).toBe(70000)
  })
})