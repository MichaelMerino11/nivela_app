import { supabase } from '@/services/supabase'

export interface MovementCategory {
  id: string
  name: string
  icon: string | null
  color_hex: string | null
}

export interface Movement {
  id: string

  cycle_id: string | null
  category_id: string | null

  kind: 'expense' | 'income'

  amount_cents: number

  occurred_at: string
  description: string | null

  is_exceptional: boolean
  is_justified: boolean
  justification: string | null

  variable_rule_id: string | null
  recurring_item_id: string | null
  planned_expense_id: string | null

  created_at: string

  category: MovementCategory | null
}

export interface MovementFilters {
  categoryId?: string | null

  kind?: 'expense' | 'income' | null

  from?: string | null
  to?: string | null

  exceptionalOnly?: boolean
}

export async function getMovements(filters: MovementFilters = {}): Promise<Movement[]> {
  let query = supabase
    .from('transactions')
    .select(
      `
        id,
        cycle_id,
        category_id,
        kind,
        amount_cents,
        occurred_at,
        description,
        is_exceptional,
        is_justified,
        justification,
        variable_rule_id,
        recurring_item_id,
        planned_expense_id,
        created_at,
        category:categories (
          id,
          name,
          icon,
          color_hex
        )
      `,
    )
    .order('occurred_at', {
      ascending: false,
    })

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters.kind) {
    query = query.eq('kind', filters.kind)
  }

  if (filters.from) {
    query = query.gte('occurred_at', `${filters.from}T00:00:00`)
  }

  if (filters.to) {
    query = query.lte('occurred_at', `${filters.to}T23:59:59`)
  }

  if (filters.exceptionalOnly) {
    query = query.eq('is_exceptional', true)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data as unknown as Movement[]
}

export async function deleteMovement(movementId: string): Promise<void> {
  if (!movementId) {
    throw new Error('Movimiento inválido.')
  }

  const { error } = await supabase.rpc('delete_transaction', {
    p_transaction_id: movementId,
  })

  if (error) {
    throw error
  }
}