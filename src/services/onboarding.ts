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