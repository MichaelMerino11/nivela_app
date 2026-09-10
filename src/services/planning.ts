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
  upcomingPlannedExpensesCents: number
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

  spentTodayCents: number

  dailyPlan: DailyPlanPreview[]
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
  id: string

  expected_amount_cents: number
  max_amount_cents: number

  priority: 'necessary' | 'flexible' | 'optional'
}

interface PlannedExpense {
  id: string
  amount_cents: number
  planned_date: string
  reserve_funds: boolean
  is_exceptional: boolean
}

interface TransactionRecord {
  kind: 'expense' | 'income'

  amount_cents: number
  occurred_at: string
  created_at: string

  variable_rule_id: string | null
  recurring_item_id: string | null
  planned_expense_id: string | null
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

    const normal = routine?.normal_amount_cents ?? 0

    const maximum = Math.max(routine?.max_amount_cents ?? normal, normal)

    return {
      date,

      activity: routine?.title ?? 'Día normal',

      normal,
      maximum,
    }
  })

  const available = Math.max(distributableCents, 0)

  const totalNormal = rawDays.reduce((total, day) => total + day.normal, 0)

  const totalMargin = rawDays.reduce(
    (total, day) => total + Math.max(day.maximum - day.normal, 0),
    0,
  )

  /*
   * Si no alcanza para cubrir la rutina normal,
   * reducimos todos los días proporcionalmente.
   */
  const normalScale = totalNormal > 0 ? Math.min(available / totalNormal, 1) : 0

  /*
   * El margen "máximo" solamente existe
   * cuando ya podemos cubrir primero
   * toda la rutina normal.
   */
  const extraAvailable = Math.max(available - totalNormal, 0)

  const marginScale =
    available > totalNormal && totalMargin > 0 ? Math.min(extraAvailable / totalMargin, 1) : 0

  return rawDays.map((day) => {
    const recommended = Math.round(day.normal * normalScale)

    const routineMargin = Math.max(day.maximum - day.normal, 0)

    const allowedExtra = Math.round(routineMargin * marginScale)

    const maximumRecommended = Math.min(day.maximum, recommended + allowedExtra)

    return {
      date: format(day.date, 'yyyy-MM-dd'),

      label: format(day.date, "EEE d 'de' MMM", {
        locale: es,
      }),

      activity: day.activity,

      routineNormalCents: day.normal,

      routineMaxCents: day.maximum,

      recommendedCents: recommended,

      maximumRecommendedCents: Math.max(recommended, maximumRecommended),
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
  snapshot_date,
  created_at
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

  const [recurringResponse, routinesResponse, variablesResponse, transactionsResponse] =
    await Promise.all([
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
    id,
    expected_amount_cents,
    max_amount_cents,
    priority
  `,
        )
        .eq('active', true),

      supabase
        .from('transactions')
        .select(
          `
    kind,
    amount_cents,
    occurred_at,
    created_at,
    variable_rule_id,
    recurring_item_id,
    planned_expense_id
  `,
        )
        .eq('cycle_id', cycle.id)
        .gt('created_at', snapshot.created_at),
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

  if (transactionsResponse.error) {
    throw transactionsResponse.error
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

  const { data: plannedData, error: plannedError } = await supabase
    .from('planned_expenses')
    .select(
      `
    id,
    amount_cents,
    planned_date,
    reserve_funds,
    is_exceptional
  `,
    )
    .eq('status', 'planned')
    .eq('reserve_funds', true)
    .gte('planned_date', format(effectiveStartDate, 'yyyy-MM-dd'))
    .lte('planned_date', format(endDate, 'yyyy-MM-dd'))

  if (plannedError) {
    throw plannedError
  }

  const plannedExpenses = plannedData as PlannedExpense[]

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

  /*
   * La reserva variable parte del momento
   * en que se creó el saldo base.
   *
   * Así, el dinero reservado no se libera
   * automáticamente solo porque pase un día.
   */
  let reserveStartDate = cycleStartDate

  if (snapshotDate > reserveStartDate) {
    reserveStartDate = snapshotDate
  }

  const reserveDates =
    reserveStartDate <= endDate
      ? eachDayOfInterval({
          start: reserveStartDate,
          end: endDate,
        })
      : []

  const reserveCycleRatio =
    totalCycleDays > 0 ? Math.min(Math.max(reserveDates.length / totalCycleDays, 0), 1) : 0

  const recurringItems = recurringResponse.data as RecurringItem[]

  const routines = routinesResponse.data as RoutineRule[]

  const variables = variablesResponse.data as VariableRule[]

  const transactions = transactionsResponse.data as TransactionRecord[]

  /*
   * Variación real del saldo desde
   * el último snapshot.
   */
  const transactionDeltaCents = transactions.reduce((total, transaction) => {
    if (transaction.kind === 'income') {
      return total + transaction.amount_cents
    }

    return total - transaction.amount_cents
  }, 0)

  /*
   * Transacciones que pertenecen al
   * período que estamos planificando.
   */
  const effectiveStartKey = format(effectiveStartDate, 'yyyy-MM-dd')

  const endDateKey = format(endDate, 'yyyy-MM-dd')

  const relevantExpenses = transactions.filter((transaction) => {
    if (transaction.kind !== 'expense') {
      return false
    }

    const transactionDate = format(parseISO(transaction.occurred_at), 'yyyy-MM-dd')

    return transactionDate >= effectiveStartKey && transactionDate <= endDateKey
  })

  /*
   * Para reservas variables necesitamos
   * recordar todos los gastos registrados
   * desde el último snapshot.
   */
  const variableExpensesSinceSnapshot = transactions.filter(
    (transaction) => transaction.kind === 'expense' && Boolean(transaction.variable_rule_id),
  )

  /*
   * Cuánto de cada reserva variable
   * o compromiso ya fue consumido.
   */
  const variableSpentById = new Map<string, number>()

  const recurringSpentById = new Map<string, number>()

  const plannedSpentById = new Map<string, number>()

  for (const transaction of relevantExpenses) {
    if (transaction.recurring_item_id) {
      const current = recurringSpentById.get(transaction.recurring_item_id) ?? 0

      recurringSpentById.set(transaction.recurring_item_id, current + transaction.amount_cents)
    }

    if (transaction.planned_expense_id) {
      const current = plannedSpentById.get(transaction.planned_expense_id) ?? 0

      plannedSpentById.set(transaction.planned_expense_id, current + transaction.amount_cents)
    }
  }

  /*
   * Los variables sí se calculan usando
   * todo lo consumido desde el snapshot.
   */
  for (const transaction of variableExpensesSinceSnapshot) {
    if (!transaction.variable_rule_id) {
      continue
    }

    const current = variableSpentById.get(transaction.variable_rule_id) ?? 0

    variableSpentById.set(transaction.variable_rule_id, current + transaction.amount_cents)
  }

  /*
   * Compromisos pendientes.
   */
  const upcomingCommitmentsCents = recurringItems.reduce((total, item) => {
    const occurrences = countOccurrences(item, effectiveStartDate, endDate)

    const expected = item.amount_cents * occurrences

    const alreadyPaid = recurringSpentById.get(item.id) ?? 0

    const pending = Math.max(expected - alreadyPaid, 0)

    return total + pending
  }, 0)

  /*
   * Solo compromisos obligatorios.
   */
  const essentialCommitmentsCents = recurringItems
    .filter((item) => item.is_essential)
    .reduce((total, item) => {
      const occurrences = countOccurrences(item, effectiveStartDate, endDate)

      const expected = item.amount_cents * occurrences

      const alreadyPaid = recurringSpentById.get(item.id) ?? 0

      const pending = Math.max(expected - alreadyPaid, 0)

      return total + pending
    }, 0)

  /*
   * Reserva variable restante.
   *
   * Ejemplo:
   * reserva esperada restante = $10
   * ya gastado = $4
   * pendiente = $6
   */
  function remainingVariableAmount(item: VariableRule): number {
    const expectedRemaining = Math.round(item.expected_amount_cents * reserveCycleRatio)

    const alreadySpent = variableSpentById.get(item.id) ?? 0

    return Math.max(expectedRemaining - alreadySpent, 0)
  }

  const variableReserveCents = variables.reduce(
    (total, item) => total + remainingVariableAmount(item),
    0,
  )

  const necessaryVariableCents = variables
    .filter((item) => item.priority === 'necessary')
    .reduce((total, item) => total + remainingVariableAmount(item), 0)

  const adjustableVariableCents = variables
    .filter((item) => item.priority !== 'necessary')
    .reduce((total, item) => total + remainingVariableAmount(item), 0)

  const upcomingPlannedExpensesCents = plannedExpenses.reduce((total, item) => {
    const alreadySpent = plannedSpentById.get(item.id) ?? 0

    const pending = Math.max(item.amount_cents - alreadySpent, 0)

    return total + pending
  }, 0)

  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const spentTodayCents = transactions
    .filter(
      (transaction) =>
        transaction.kind === 'expense' &&
        format(parseISO(transaction.occurred_at), 'yyyy-MM-dd') === todayKey,
    )
    .reduce((total, transaction) => total + transaction.amount_cents, 0)

  const currentBalanceCents = snapshot.balance_cents + transactionDeltaCents

  const savingsTargetCents = cycle.savings_target_cents

  const distributableCents =
    currentBalanceCents -
    savingsTargetCents -
    upcomingCommitmentsCents -
    variableReserveCents -
    upcomingPlannedExpensesCents

  const essentialDistributableCents =
    currentBalanceCents - savingsTargetCents - essentialCommitmentsCents - necessaryVariableCents

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
    upcomingPlannedExpensesCents,
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

    dailyPlan,
    nextDays: dailyPlan.slice(0, 7),

    spentTodayCents,
  }
}
