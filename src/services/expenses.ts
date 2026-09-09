import { supabase } from '@/services/supabase'

export interface ExpenseCategory {
  id: string
  name: string
  slug: string
  icon: string | null
  color_hex: string | null
}

export interface ExpenseVariableRule {
  id: string
  category_id: string | null
  title: string
  expected_amount_cents: number
  max_amount_cents: number
  priority: 'necessary' | 'flexible' | 'optional'
}

export interface ExpenseRecurringItem {
  id: string
  category_id: string | null
  name: string
  amount_cents: number
  frequency: 'monthly' | 'weekly'

  weekday: number | null
  day_of_month: number | null
  is_essential: boolean
}

export interface ExpenseFormOptions {
  categories: ExpenseCategory[]
  variableRules: ExpenseVariableRule[]
  recurringItems: ExpenseRecurringItem[]
}

export interface RegisterExpenseInput {
  amountCents: number
  categoryId: string
  description?: string

  isExceptional?: boolean
  isJustified?: boolean
  justification?: string

  occurredAt?: string

  variableRuleId?: string | null
  recurringItemId?: string | null
  plannedExpenseId?: string | null
}

export async function getExpenseFormOptions(): Promise<ExpenseFormOptions> {
  const [categoriesResponse, variablesResponse, recurringResponse] = await Promise.all([
    supabase
      .from('categories')
      .select(
        `
        id,
        name,
        slug,
        icon,
        color_hex
      `,
      )
      .eq('kind', 'expense')
      .eq('active', true)
      .order('name'),

    supabase
      .from('variable_spending_rules')
      .select(
        `
        id,
        category_id,
        title,
        expected_amount_cents,
        max_amount_cents,
        priority
      `,
      )
      .eq('active', true)
      .order('title'),

    supabase
      .from('recurring_items')
      .select(
        `
        id,
        category_id,
        name,
        amount_cents,
        frequency,
        weekday,
        day_of_month,
        is_essential
      `,
      )
      .eq('active', true)
      .eq('kind', 'expense')
      .order('name'),
  ])

  if (categoriesResponse.error) {
    throw categoriesResponse.error
  }

  if (variablesResponse.error) {
    throw variablesResponse.error
  }

  if (recurringResponse.error) {
    throw recurringResponse.error
  }

  const categories = categoriesResponse.data as ExpenseCategory[]

  const variableRules = variablesResponse.data as ExpenseVariableRule[]

  const recurringItems = recurringResponse.data as ExpenseRecurringItem[]

  return {
    categories,
    variableRules,
    recurringItems,
  }
}

export async function registerExpense(input: RegisterExpenseInput): Promise<string> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('El monto del gasto no es válido.')
  }

  if (!input.categoryId) {
    throw new Error('Debes seleccionar una categoría.')
  }

  if (input.isJustified && !input.isExceptional) {
    throw new Error('Solo puedes justificar un gasto excepcional.')
  }

  if (input.isJustified && !input.justification?.trim()) {
    throw new Error('Escribe por qué este gasto fue necesario.')
  }

  const { data, error } = await supabase.rpc('register_expense', {
    p_amount_cents: input.amountCents,

    p_category_id: input.categoryId,

    p_description: input.description?.trim() || null,

    p_is_exceptional: input.isExceptional ?? false,

    p_is_justified: input.isJustified ?? false,

    p_justification: input.isJustified ? input.justification?.trim() || null : null,

    p_occurred_at: input.occurredAt ?? new Date().toISOString(),

    p_variable_rule_id: input.variableRuleId ?? null,

    p_recurring_item_id: input.recurringItemId ?? null,

    p_planned_expense_id: input.plannedExpenseId ?? null,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo registrar el gasto.')
  }

  return data as string
}
