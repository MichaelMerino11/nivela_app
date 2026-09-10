import { supabase } from '@/services/supabase'

export interface CycleRolloverContext {
  cycleId: string

  startDate: string
  endDate: string
  paydayDate: string | null

  expectedIncomeCents: number
  savingsTargetCents: number

  salaryCents: number
  usualPayDay: number | null
}

export interface RolloverFinancialCycleInput {
  salaryReceivedCents: number
  totalBalanceCents: number

  receivedDate: string
  nextPaydayDate: string

  savingsTargetCents: number
}

export interface RolloverFinancialCycleResult {
  closed_cycle_id: string
  new_cycle_id: string

  closing_balance_cents: number
  opening_balance_cents: number
  salary_received_cents: number

  new_start_date: string
  new_end_date: string
  next_payday_date: string

  savings_target_cents: number
}

/*
 * Información necesaria para mostrar
 * el modal antes de cambiar de ciclo.
 */
export async function getCycleRolloverContext(): Promise<CycleRolloverContext> {
  const [cycleResponse, settingsResponse] = await Promise.all([
    supabase
      .from('financial_cycles')
      .select(
        `
        id,
        start_date,
        end_date,
        payday_date,
        expected_income_cents,
        savings_target_cents
      `,
      )
      .eq('status', 'active')
      .single(),

    supabase
      .from('financial_settings')
      .select(
        `
        salary_cents,
        usual_pay_day
      `,
      )
      .single(),
  ])

  if (cycleResponse.error) {
    throw cycleResponse.error
  }

  if (settingsResponse.error) {
    throw settingsResponse.error
  }

  const cycle = cycleResponse.data

  const settings = settingsResponse.data

  return {
    cycleId: cycle.id,

    startDate: cycle.start_date,

    endDate: cycle.end_date,

    paydayDate: cycle.payday_date,

    expectedIncomeCents: cycle.expected_income_cents,

    savingsTargetCents: cycle.savings_target_cents,

    salaryCents: settings.salary_cents,

    usualPayDay: settings.usual_pay_day,
  }
}

/*
 * Cierra el ciclo anterior
 * y abre uno nuevo.
 *
 * Esta operación modifica datos reales,
 * por eso todas las validaciones importantes
 * también están en el RPC de PostgreSQL.
 */
export async function rolloverFinancialCycle(
  input: RolloverFinancialCycleInput,
): Promise<RolloverFinancialCycleResult> {
  if (!Number.isInteger(input.salaryReceivedCents) || input.salaryReceivedCents <= 0) {
    throw new Error('El sueldo recibido debe ser mayor que cero.')
  }

  if (!Number.isInteger(input.totalBalanceCents)) {
    throw new Error('El saldo total no es válido.')
  }

  if (!input.receivedDate) {
    throw new Error('Selecciona la fecha en que recibiste el sueldo.')
  }

  if (!input.nextPaydayDate) {
    throw new Error('Selecciona la próxima fecha de pago.')
  }

  if (input.nextPaydayDate <= input.receivedDate) {
    throw new Error('La próxima fecha de pago debe ser posterior a la fecha actual.')
  }

  if (!Number.isInteger(input.savingsTargetCents) || input.savingsTargetCents < 0) {
    throw new Error('La meta de ahorro no es válida.')
  }

  const { data, error } = await supabase.rpc('rollover_financial_cycle', {
    p_salary_received_cents: input.salaryReceivedCents,

    p_total_balance_cents: input.totalBalanceCents,

    p_received_date: input.receivedDate,

    p_next_payday_date: input.nextPaydayDate,

    p_savings_target_cents: input.savingsTargetCents,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo iniciar el nuevo ciclo financiero.')
  }

  return data as RolloverFinancialCycleResult
}