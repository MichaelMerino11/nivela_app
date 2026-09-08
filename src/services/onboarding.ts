import { supabase } from '@/services/supabase'

interface SaveBasicsInput {
  salaryCents: number
  currentBalanceCents: number
  savingsTargetCents: number

  lastPayday: string
  nextPayday: string
  snapshotDate: string
}

export async function saveOnboardingBasics(input: SaveBasicsInput) {
  const { data, error } = await supabase.rpc('save_onboarding_basics', {
    p_salary_cents: input.salaryCents,
    p_current_balance_cents: input.currentBalanceCents,
    p_savings_target_cents: input.savingsTargetCents,
    p_last_payday: input.lastPayday,
    p_next_payday: input.nextPayday,
    p_snapshot_date: input.snapshotDate,
  })

  if (error) {
    throw error
  }

  return data as string
}

export interface ExpenseCategory {
  id: string
  name: string
  slug: string
  icon: string | null
  color_hex: string | null
}

export interface CommitmentInput {
  categoryId: string | null
  name: string
  amountCents: number

  frequency: 'monthly' | 'weekly'

  weekday: number | null
  dayOfMonth: number | null

  isEssential: boolean
}

export async function getExpenseCategories() {
  const { data, error } = await supabase
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
    .in('kind', ['expense', 'both'])
    .eq('active', true)
    .order('name')

  if (error) {
    throw error
  }

  return data as ExpenseCategory[]
}

export async function saveOnboardingCommitments(items: CommitmentInput[]) {
  const payload = items.map((item) => ({
    category_id: item.categoryId,
    name: item.name,
    amount_cents: item.amountCents,

    frequency: item.frequency,

    weekday: item.weekday,
    day_of_month: item.dayOfMonth,

    is_essential: item.isEssential,
  }))

  const { error } = await supabase.rpc('save_onboarding_commitments', {
    p_items: payload,
  })

  if (error) {
    throw error
  }
}

export interface RoutineRuleInput {
  title: string
  weekday: number
  normalAmountCents: number
  maxAmountCents: number
}

export async function saveOnboardingRoutine(rules: RoutineRuleInput[]) {
  const payload = rules.map((rule) => ({
    title: rule.title,
    weekday: rule.weekday,
    normal_amount_cents: rule.normalAmountCents,
    max_amount_cents: rule.maxAmountCents,
  }))

  const { error } = await supabase.rpc('save_onboarding_routine', {
    p_rules: payload,
  })

  if (error) {
    throw error
  }
}

export type VariablePriority = 'necessary' | 'flexible' | 'optional'

export interface VariableSpendingInput {
  title: string
  categoryId: string | null

  expectedAmountCents: number
  maxAmountCents: number

  priority: VariablePriority
}

export async function saveOnboardingVariables(items: VariableSpendingInput[]) {
  const payload = items.map((item) => ({
    title: item.title,
    category_id: item.categoryId,

    expected_amount_cents: item.expectedAmountCents,

    max_amount_cents: item.maxAmountCents,

    priority: item.priority,
  }))

  const { error } = await supabase.rpc('save_onboarding_variables', {
    p_items: payload,
  })

  if (error) {
    throw error
  }
}