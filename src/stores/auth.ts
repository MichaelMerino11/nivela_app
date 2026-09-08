import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '@/services/supabase'

interface Profile {
  id: string
  email: string | null
  full_name: string | null
}

interface FinancialSettings {
  id: string
  user_id: string
  currency_code: string
  timezone: string
  salary_cents: number
  usual_pay_day: number | null
  savings_target_cents: number
  minimum_buffer_cents: number
  cycle_strategy: string
  onboarding_completed: boolean
  onboarding_step: number
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)

  const profile = ref<Profile | null>(null)
  const financialSettings = ref<FinancialSettings | null>(null)

  const loading = ref(true)

  const isAuthenticated = computed(() => !!session.value)

  const displayName = computed(() => {
    return profile.value?.full_name || user.value?.email || 'Michael'
  })

  const onboardingCompleted = computed(() => {
    return financialSettings.value?.onboarding_completed ?? false
  })

  async function loadUserData() {
    if (!user.value) {
      profile.value = null
      financialSettings.value = null
      return
    }

    const [profileResponse, settingsResponse] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('id', user.value.id).single(),

      supabase
        .from('financial_settings')
        .select(
          `
      id,
      user_id,
      currency_code,
      timezone,
      salary_cents,
      usual_pay_day,
      savings_target_cents,
      minimum_buffer_cents,
      cycle_strategy,
      onboarding_completed,
      onboarding_step
    `,
        )
        .eq('user_id', user.value.id)
        .single(),
    ])

    if (profileResponse.error) {
      throw profileResponse.error
    }

    if (settingsResponse.error) {
      throw settingsResponse.error
    }

    profile.value = profileResponse.data
    financialSettings.value = settingsResponse.data
  }

  async function initialize() {
    try {
      loading.value = true

      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      session.value = currentSession
      user.value = currentSession?.user ?? null

      if (user.value) {
        await loadUserData()
      }
    } finally {
      loading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    session.value = data.session
    user.value = data.user

    await loadUserData()
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    session.value = null
    user.value = null
    profile.value = null
    financialSettings.value = null
  }

  return {
    session,
    user,
    profile,
    financialSettings,
    loading,
    isAuthenticated,
    displayName,
    onboardingCompleted,

    initialize,
    loadUserData,
    signIn,
    signOut,
  }
})
