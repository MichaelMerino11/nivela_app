import { supabase } from '@/services/supabase'

export interface FinancialSettings {
  salaryCents: number

  usualPayDay: number | null

  savingsTargetCents: number
  minimumBufferCents: number

  currencyCode: string
  timezone: string

  cycleStrategy: string
}

export interface UpdateFinancialSettingsInput {
  salaryCents: number
  usualPayDay: number
  savingsTargetCents: number
  minimumBufferCents: number
}

interface FinancialSettingsRow {
  salary_cents: number

  usual_pay_day: number | null

  savings_target_cents: number
  minimum_buffer_cents: number

  currency_code: string
  timezone: string

  cycle_strategy: string
}

export async function getFinancialSettings(): Promise<FinancialSettings> {
  const { data, error } = await supabase
    .from('financial_settings')
    .select(
      `
      salary_cents,
      usual_pay_day,
      savings_target_cents,
      minimum_buffer_cents,
      currency_code,
      timezone,
      cycle_strategy
    `,
    )
    .single()

  if (error) {
    throw error
  }

  const row = data as FinancialSettingsRow

  return {
    salaryCents: row.salary_cents,

    usualPayDay: row.usual_pay_day,

    savingsTargetCents: row.savings_target_cents,

    minimumBufferCents: row.minimum_buffer_cents,

    currencyCode: row.currency_code,

    timezone: row.timezone,

    cycleStrategy: row.cycle_strategy,
  }
}

export async function updateFinancialSettings(input: UpdateFinancialSettingsInput): Promise<void> {
  if (!Number.isInteger(input.salaryCents) || input.salaryCents < 0) {
    throw new Error('El sueldo no es válido.')
  }

  if (!Number.isInteger(input.usualPayDay) || input.usualPayDay < 1 || input.usualPayDay > 31) {
    throw new Error('El día de pago debe estar entre 1 y 31.')
  }

  if (!Number.isInteger(input.savingsTargetCents) || input.savingsTargetCents < 0) {
    throw new Error('La meta de ahorro no es válida.')
  }

  if (!Number.isInteger(input.minimumBufferCents) || input.minimumBufferCents < 0) {
    throw new Error('El colchón mínimo no es válido.')
  }

  const { error } = await supabase.rpc('update_financial_settings', {
    p_salary_cents: input.salaryCents,

    p_usual_pay_day: input.usualPayDay,

    p_savings_target_cents: input.savingsTargetCents,

    p_minimum_buffer_cents: input.minimumBufferCents,
  })

  if (error) {
    throw error
  }
}