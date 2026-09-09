import { supabase } from '@/services/supabase'

export interface PlannedExpenseItem {
  id: string
  category_id: string | null

  name: string
  amount_cents: number
  planned_date: string

  status: 'planned' | 'paid' | 'cancelled'

  reserve_funds: boolean
  is_exceptional: boolean

  justification: string | null
  notes: string | null

  created_at: string
  updated_at: string
}

export interface CreatePlannedExpenseInput {
  categoryId?: string | null

  name: string
  amountCents: number
  plannedDate: string

  reserveFunds?: boolean
  isExceptional?: boolean

  justification?: string
  notes?: string
}

export async function getPlannedExpenses(): Promise<PlannedExpenseItem[]> {
  const { data, error } = await supabase
    .from('planned_expenses')
    .select(
      `
      id,
      category_id,
      name,
      amount_cents,
      planned_date,
      status,
      reserve_funds,
      is_exceptional,
      justification,
      notes,
      created_at,
      updated_at
    `,
    )
    .order('planned_date', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return data as PlannedExpenseItem[]
}

export async function createPlannedExpense(input: CreatePlannedExpenseInput): Promise<string> {
  const name = input.name.trim()

  if (!name) {
    throw new Error('Escribe qué gasto estás planeando.')
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('El monto debe ser mayor que cero.')
  }

  if (!input.plannedDate) {
    throw new Error('Selecciona una fecha.')
  }

  const { data, error } = await supabase.rpc('create_planned_expense', {
    p_name: name,

    p_amount_cents: input.amountCents,

    p_planned_date: input.plannedDate,

    p_category_id: input.categoryId ?? null,

    p_reserve_funds: input.reserveFunds ?? true,

    p_is_exceptional: input.isExceptional ?? false,

    p_justification: input.justification?.trim() || null,

    p_notes: input.notes?.trim() || null,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo crear el gasto planificado.')
  }

  return data as string
}

export async function cancelPlannedExpense(plannedExpenseId: string): Promise<void> {
  if (!plannedExpenseId) {
    throw new Error('Gasto planificado inválido.')
  }

  const { error } = await supabase.rpc('cancel_planned_expense', {
    p_planned_expense_id: plannedExpenseId,
  })

  if (error) {
    throw error
  }
}

export interface CompletePlannedExpenseInput {
  plannedExpenseId: string

  actualAmountCents: number

  categoryId: string

  occurredAt: string
}

export async function completePlannedExpense(input: CompletePlannedExpenseInput): Promise<string> {
  if (!input.plannedExpenseId) {
    throw new Error('Gasto planificado inválido.')
  }

  if (!Number.isInteger(input.actualAmountCents) || input.actualAmountCents <= 0) {
    throw new Error('El monto pagado debe ser mayor que cero.')
  }

  if (!input.categoryId) {
    throw new Error('Selecciona una categoría.')
  }

  if (!input.occurredAt) {
    throw new Error('Selecciona la fecha del pago.')
  }

  const { data, error } = await supabase.rpc('complete_planned_expense', {
    p_planned_expense_id: input.plannedExpenseId,

    p_actual_amount_cents: input.actualAmountCents,

    p_category_id: input.categoryId,

    p_occurred_at: input.occurredAt,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo registrar el pago.')
  }

  return data as string
}
