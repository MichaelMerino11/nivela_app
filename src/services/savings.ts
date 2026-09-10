import { supabase } from '@/services/supabase'
import { calculateSavingsProgress } from '@/services/savings-engine'

export interface SavingsContribution {
  id: string
  amountCents: number
  contributionDate: string
  notes: string | null
  createdAt: string
}

export interface SavingsOverview {
  cycleId: string
  cycleStartDate: string
  cycleEndDate: string

  targetCents: number
  savedCents: number
  remainingCents: number
  exceededCents: number

  progressPercentage: number

  contributions: SavingsContribution[]
}

interface SavingsContributionRow {
  id: string
  amount_cents: number
  contribution_date: string
  notes: string | null
  created_at: string
}

export async function getSavingsOverview(): Promise<SavingsOverview> {
  /*
   * Primero obtenemos el ciclo activo,
   * porque la meta de ahorro pertenece
   * a ese ciclo.
   */
  const { data: cycle, error: cycleError } = await supabase
    .from('financial_cycles')
    .select(
      `
      id,
      start_date,
      end_date,
      savings_target_cents
    `,
    )
    .eq('status', 'active')
    .single()

  if (cycleError) {
    throw cycleError
  }

  /*
   * Ahora obtenemos únicamente los
   * aportes reales registrados para
   * este ciclo.
   */
  const { data, error } = await supabase
    .from('savings_contributions')
    .select(
      `
      id,
      amount_cents,
      contribution_date,
      notes,
      created_at
    `,
    )
    .eq('cycle_id', cycle.id)
    .order('contribution_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  const rows = data as SavingsContributionRow[]

  const contributions: SavingsContribution[] = rows.map((row) => ({
    id: row.id,

    amountCents: row.amount_cents,

    contributionDate: row.contribution_date,

    notes: row.notes,

    createdAt: row.created_at,
  }))

  const targetCents = cycle.savings_target_cents

  const { savedCents, remainingCents, exceededCents, progressPercentage } =
    calculateSavingsProgress(targetCents, contributions)

  return {
    cycleId: cycle.id,

    cycleStartDate: cycle.start_date,

    cycleEndDate: cycle.end_date,

    targetCents,
    savedCents,
    remainingCents,
    exceededCents,
    progressPercentage,

    contributions,
  }
}

export async function registerSavingsContribution(
  amountCents: number,
  contributionDate: string,
  notes?: string | null,
): Promise<string> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('El monto debe ser mayor que cero.')
  }

  if (!contributionDate) {
    throw new Error('Selecciona la fecha del ahorro.')
  }

  const { data, error } = await supabase.rpc('register_savings_contribution', {
    p_amount_cents: amountCents,

    p_contribution_date: contributionDate,

    p_notes: notes?.trim() || null,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo registrar el ahorro.')
  }

  return data as string
}

export async function deleteSavingsContribution(contributionId: string): Promise<void> {
  if (!contributionId) {
    throw new Error('Aporte de ahorro inválido.')
  }

  const { error } = await supabase.rpc('delete_savings_contribution', {
    p_contribution_id: contributionId,
  })

  if (error) {
    throw error
  }
}
