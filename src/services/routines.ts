import { supabase } from '@/services/supabase'

export interface RoutineBudgetRule {
  id: string

  category_id: string | null

  title: string
  weekday: number

  normal_amount_cents: number
  max_amount_cents: number

  active: boolean
}

export async function getRoutineBudgetRules(): Promise<RoutineBudgetRule[]> {
  const { data, error } = await supabase
    .from('routine_rules')
    .select(
      `
      id,
      category_id,
      title,
      weekday,
      normal_amount_cents,
      max_amount_cents,
      active
    `,
    )
    .eq('active', true)
    .order('weekday', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return data as RoutineBudgetRule[]
}

export async function setRoutineCategory(
  routineRuleId: string,
  categoryId: string | null,
): Promise<void> {
  if (!routineRuleId) {
    throw new Error('Rutina inválida.')
  }

  const { error } = await supabase.rpc('set_routine_category', {
    p_routine_rule_id: routineRuleId,

    p_category_id: categoryId,
  })

  if (error) {
    throw error
  }
}