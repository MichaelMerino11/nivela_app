import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  getISODay,
  parseISO,
  startOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/services/supabase'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface DailyPlanPreview {
  date: string
  label: string
  activity: string

  routineNormalCents: number
  routineMaxCents: number

  recommendedCents: number
  maximumRecommendedCents: number
}

export interface PlanningSummary {
  cycleId: string

  cycleStartDate: string
  cycleEndDate: string
  snapshotDate: string

  currentBalanceCents: number
  savingsTargetCents: number

  upcomingCommitmentsCents: number
  variableReserveCents: number
  necessaryVariableCents: number
  adjustableVariableCents: number

  distributableCents: number
  essentialDistributableCents: number

  routineNeedCents: number

  daysRemaining: number
  dailyAverageCents: number

  projectedSurplusCents: number

  riskScore: number
  riskLevel: RiskLevel

  nextDays: DailyPlanPreview[]
}

interface RecurringItem {
  id: string
  name: string
  amount_cents: number

  frequency: 'monthly' | 'weekly'

  weekday: number | null
  day_of_month: number | null

  is_essential: boolean
}

interface RoutineRule {
  weekday: number
  title: string
  normal_amount_cents: number
  max_amount_cents: number
}

interface VariableRule {
  expected_amount_cents: number
  max_amount_cents: number

  priority: 'necessary' | 'flexible' | 'optional'
}

function countOccurrences(item: RecurringItem, startDate: Date, endDate: Date): number {
  const dates = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  if (item.frequency === 'weekly') {
    if (!item.weekday) {
      return 0
    }

    return dates.filter((date) => getISODay(date) === item.weekday).length
  }

  if (!item.day_of_month) {
    return 0
  }

  return dates.filter((date) => {
    const lastDay = getDate(endOfMonth(date))

    const dueDay = Math.min(item.day_of_month!, lastDay)

    return getDate(date) === dueDay
  }).length
}

function calculateRisk(
  distributableCents: number,
  essentialDistributableCents: number,
  routineNeedCents: number,
): {
  score: number
  level: RiskLevel
} {
  /*
   * Ni siquiera los compromisos esenciales
   * están cubiertos.
   */
  if (essentialDistributableCents < 0) {
    return {
      score: 95,
      level: 'high',
    }
  }

  /*
   * Para cumplir el presupuesto completo
   * habría que recortar variables flexibles
   * u opcionales.
   */
  if (distributableCents < 0) {
    return {
      score: 72,
      level: 'high',
    }
  }

  if (routineNeedCents <= 0) {
    return {
      score: 10,
      level: 'low',
    }
  }

  const coverage = distributableCents / routineNeedCents

  if (coverage >= 1.25) {
    return {
      score: 14,
      level: 'low',
    }
  }

  if (coverage >= 1) {
    return {
      score: 28,
      level: 'low',
    }
  }

  if (coverage >= 0.8) {
    return {
      score: 48,
      level: 'medium',
    }
  }

  if (coverage >= 0.6) {
    return {
      score: 66,
      level: 'medium',
    }
  }

  return {
    score: 82,
    level: 'high',
  }
}

function calculateDailyPlan(
  dates: Date[],
  routines: RoutineRule[],
  distributableCents: number,
): DailyPlanPreview[] {
  const routineMap = new Map(routines.map((routine) => [routine.weekday, routine]))

  const rawDays = dates.map((date) => {
    const weekday = getISODay(date)

    const routine = routineMap.get(weekday)

    return {
      date,

      activity: routine?.title || 'Día normal',

      normal: routine?.normal_amount_cents || 0,

      maximum: routine?.max_amount_cents || routine?.normal_amount_cents || 0,
    }
  })

  const totalNormal = rawDays.reduce((total, day) => total + day.normal, 0)

  const available = Math.max(distributableCents, 0)

  /*
   * Si la rutina habitual cuesta más
   * de lo disponible, reducimos todos
   * los días proporcionalmente.
   *
   * Si alcanza, mantenemos la rutina
   * normal y dejamos el sobrante como
   * colchón financiero.
   */
  const scale = totalNormal > 0 && available < totalNormal ? available / totalNormal : 1

  const normalBudgetTotal = rawDays.reduce((total, day) => total + day.normal, 0)

  const remainingAfterNormal = Math.max(available - normalBudgetTotal, 0)
  /*
   * Si todos los días tienen $0 de rutina,
   * repartimos de forma uniforme.
   */
  const equalBudget =
    totalNormal === 0 && rawDays.length > 0 ? Math.floor(available / rawDays.length) : 0

  return rawDays.map((day) => {
    const recommended = totalNormal === 0 ? equalBudget : Math.round(day.normal * scale)

    const routineMargin = Math.max(day.maximum - day.normal, 0)

    const extraShare = rawDays.length > 0 ? Math.floor(remainingAfterNormal / rawDays.length) : 0

    const maximumRecommended = Math.max(
      recommended,
      Math.min(day.maximum, recommended + routineMargin + extraShare),
    )

    return {
      date: format(day.date, 'yyyy-MM-dd'),

      label: format(day.date, "EEE d 'de' MMM", {
        locale: es,
      }),

      activity: day.activity,

      routineNormalCents: day.normal,

      routineMaxCents: day.maximum,

      recommendedCents: recommended,

      maximumRecommendedCents: maximumRecommended,
    }
  })
}

export async function getPlanningSummary(): Promise<PlanningSummary> {
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

  const { data: snapshot, error: snapshotError } = await supabase
    .from('balance_snapshots')
    .select(
      `
      balance_cents,
      snapshot_date
    `,
    )
    .eq('cycle_id', cycle.id)
    .order('snapshot_date', {
      ascending: false,
    })
    .limit(1)
    .single()

  if (snapshotError) {
    throw snapshotError
  }

  const [recurringResponse, routinesResponse, variablesResponse] = await Promise.all([
    supabase
      .from('recurring_items')
      .select(
        `
        id,
        name,
        amount_cents,
        frequency,
        weekday,
        day_of_month,
        is_essential
      `,
      )
      .eq('active', true),

    supabase
      .from('routine_rules')
      .select(
        `
        weekday,
        title,
        normal_amount_cents,
        max_amount_cents
      `,
      )
      .eq('active', true),

    supabase
      .from('variable_spending_rules')
      .select(
        `
        expected_amount_cents,
        max_amount_cents,
        priority
      `,
      )
      .eq('active', true),
  ])

  if (recurringResponse.error) {
    throw recurringResponse.error
  }

  if (routinesResponse.error) {
    throw routinesResponse.error
  }

  if (variablesResponse.error) {
    throw variablesResponse.error
  }

  const cycleStartDate = parseISO(cycle.start_date)

  const snapshotDate = parseISO(snapshot.snapshot_date)

  const endDate = parseISO(cycle.end_date)

  const today = startOfDay(new Date())

  let effectiveStartDate = cycleStartDate

  if (snapshotDate > effectiveStartDate) {
    effectiveStartDate = snapshotDate
  }

  if (today > effectiveStartDate) {
    effectiveStartDate = today
  }

  const remainingDates =
    effectiveStartDate <= endDate
      ? eachDayOfInterval({
          start: effectiveStartDate,
          end: endDate,
        })
      : []

  const cycleDates =
    cycleStartDate <= endDate
      ? eachDayOfInterval({
          start: cycleStartDate,
          end: endDate,
        })
      : []

  const daysRemaining = remainingDates.length

  const totalCycleDays = cycleDates.length

  const remainingCycleRatio =
    totalCycleDays > 0 ? Math.min(Math.max(daysRemaining / totalCycleDays, 0), 1) : 0

  const recurringItems = recurringResponse.data as RecurringItem[]
  const routines = routinesResponse.data as RoutineRule[]
  const variables = variablesResponse.data as VariableRule[]

  const upcomingCommitmentsCents = recurringItems.reduce((total, item) => {
    const occurrences = countOccurrences(item, effectiveStartDate, endDate)

    return total + item.amount_cents * occurrences
  }, 0)

  const fullVariableReserveCents = variables.reduce(
    (total, item) => total + item.expected_amount_cents,
    0,
  )

  const fullNecessaryVariableCents = variables
    .filter((item) => item.priority === 'necessary')
    .reduce((total, item) => total + item.expected_amount_cents, 0)

  const fullAdjustableVariableCents = variables
    .filter((item) => item.priority !== 'necessary')
    .reduce((total, item) => total + item.expected_amount_cents, 0)

  const variableReserveCents = Math.round(fullVariableReserveCents * remainingCycleRatio)

  const necessaryVariableCents = Math.round(fullNecessaryVariableCents * remainingCycleRatio)

  const adjustableVariableCents = Math.round(fullAdjustableVariableCents * remainingCycleRatio)

  const currentBalanceCents = snapshot.balance_cents

  const savingsTargetCents = cycle.savings_target_cents

  const distributableCents =
    currentBalanceCents - savingsTargetCents - upcomingCommitmentsCents - variableReserveCents

  const essentialDistributableCents =
    currentBalanceCents - savingsTargetCents - upcomingCommitmentsCents - necessaryVariableCents

  const routineMap = new Map(routines.map((routine) => [routine.weekday, routine]))

  const routineNeedCents = remainingDates.reduce((total, date) => {
    const routine = routineMap.get(getISODay(date))

    return total + (routine?.normal_amount_cents || 0)
  }, 0)

  const dailyAverageCents =
    daysRemaining > 0 ? Math.floor(Math.max(distributableCents, 0) / daysRemaining) : 0

  const projectedSurplusCents = distributableCents - routineNeedCents

  const risk = calculateRisk(distributableCents, essentialDistributableCents, routineNeedCents)

  const dailyPlan = calculateDailyPlan(remainingDates, routines, distributableCents)

  return {
    cycleId: cycle.id,

    cycleStartDate: cycle.start_date,

    cycleEndDate: cycle.end_date,

    snapshotDate: snapshot.snapshot_date,

    currentBalanceCents,

    savingsTargetCents,

    upcomingCommitmentsCents,

    variableReserveCents,

    necessaryVariableCents,
    adjustableVariableCents,

    distributableCents,
    essentialDistributableCents,

    routineNeedCents,

    daysRemaining,
    dailyAverageCents,

    projectedSurplusCents,

    riskScore: risk.score,

    riskLevel: risk.level,

    nextDays: dailyPlan.slice(0, 7),
  }
}
