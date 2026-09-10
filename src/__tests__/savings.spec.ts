import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}))

vi.mock('@/services/supabase', () => ({
  supabase: {
    rpc: rpcMock,
  },
}))

import { deleteSavingsContribution, registerSavingsContribution } from '@/services/savings'

describe('savings service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza un aporte con monto inválido', async () => {
    await expect(registerSavingsContribution(0, '2026-09-10')).rejects.toThrow(
      'El monto debe ser mayor que cero.',
    )

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('rechaza un aporte sin fecha', async () => {
    await expect(registerSavingsContribution(1000, '')).rejects.toThrow(
      'Selecciona la fecha del ahorro.',
    )

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('registra correctamente un aporte', async () => {
    rpcMock.mockResolvedValue({
      data: 'aporte-1',
      error: null,
    })

    const result = await registerSavingsContribution(2500, '2026-09-10', '  Ahorro semanal  ')

    expect(result).toBe('aporte-1')

    expect(rpcMock).toHaveBeenCalledWith('register_savings_contribution', {
      p_amount_cents: 2500,
      p_contribution_date: '2026-09-10',
      p_notes: 'Ahorro semanal',
    })
  })

  it('rechaza eliminar un aporte sin id', async () => {
    await expect(deleteSavingsContribution('')).rejects.toThrow('Aporte de ahorro inválido.')

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('elimina correctamente un aporte', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: null,
    })

    await expect(deleteSavingsContribution('aporte-1')).resolves.toBeUndefined()

    expect(rpcMock).toHaveBeenCalledWith('delete_savings_contribution', {
      p_contribution_id: 'aporte-1',
    })
  })
})