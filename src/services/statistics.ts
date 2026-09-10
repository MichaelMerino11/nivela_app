import { eachDayOfInterval, format, isAfter, parseISO, startOfDay } from 'date-fns'

import { supabase } from '@/services/supabase'

export interface StatisticsCategory {
  categoryId: string | null
  categoryName: string
  categoryColor: string | null

  totalCents: number
  percentage: number
}

export interface DailyStatistic {
  date: string

  spentCents: number
  cumulativeCents: number
}

export interface TopCategoryStatistic {
  categoryId: string | null
  categoryName: string

  totalCents: number
}

export interface PlannedStatistic {
  completedCount: number

  totalPlannedCents: number
  totalActualCents: number

  differenceCents: number
}

export interface StatisticsOverview {
  cycleId: string
  cycleStartDate: string
  cycleEndDate: string

  elapsedDays: number

  totalSpentCents: number
  expenseCount: number
  dailyAverageCents: number

  topCategory: TopCategoryStatistic | null

  categories: StatisticsCategory[]

  daily: DailyStatistic[]

  planned: PlannedStatistic
}

interface TransactionCategoryRow {
  id: string
  name: string
  color_hex: string | null
}

interface ExpenseTransactionRow {
  id: string

  category_id: string | null

  amount_cents: number
  occurred_at: string

  planned_expense_id: string | null

  category: TransactionCategoryRow | null
}

interface PlannedExpenseRow {
  id: string
  amount_cents: number
}

export async function getStatisticsOverview(): Promise<StatisticsOverview> {
  /*
   * Estadísticas siempre corresponden
   * al ciclo financiero activo.
   */
  const { data: cycle, error: cycleError } = await supabase
    .from('financial_cycles')
    .select(
      `
      id,
      start_date,
      end_date
    `,
    )
    .eq('status', 'active')
    .single()

  if (cycleError) {
    throw cycleError
  }

  /*
   * Solo gastos reales pertenecientes
   * al ciclo actual.
   */
  const { data: transactionsData, error: transactionsError } = await supabase
    .from('transactions')
    .select(
      `
      id,
      category_id,
      amount_cents,
      occurred_at,
      planned_expense_id,
      category:categories (
        id,
        name,
        color_hex
      )
    `,
    )
    .eq('cycle_id', cycle.id)
    .eq('kind', 'expense')
    .order('occurred_at', {
      ascending: true,
    })

  if (transactionsError) {
    throw transactionsError
  }

  const transactions = transactionsData as unknown as ExpenseTransactionRow[]

  /*
   * Resumen general.
   */
  const totalSpentCents = transactions.reduce(
    (total, transaction) => total + transaction.amount_cents,
    0,
  )

  const expenseCount = transactions.length

  /*
   * Promedio diario:
   *
   * usamos todos los días transcurridos
   * del ciclo, no solamente los días
   * donde hubo gastos.
   */
  const cycleStart = parseISO(cycle.start_date)

  const cycleEnd = parseISO(cycle.end_date)

  const today = startOfDay(new Date())

  const statisticsEnd = isAfter(today, cycleEnd) ? cycleEnd : today

  const elapsedDates = isAfter(cycleStart, statisticsEnd)
    ? []
    : eachDayOfInterval({
        start: cycleStart,

        end: statisticsEnd,
      })

  const elapsedDays = elapsedDates.length

  const dailyAverageCents = elapsedDays > 0 ? Math.round(totalSpentCents / elapsedDays) : 0

  /*
   * Gastos agrupados por categoría.
   */
  const categoryMap = new Map<string, StatisticsCategory>()

  for (const transaction of transactions) {
    const mapKey = transaction.category_id ?? '__uncategorized__'

    const current = categoryMap.get(mapKey)

    if (current) {
      current.totalCents += transaction.amount_cents

      continue
    }

    categoryMap.set(mapKey, {
      categoryId: transaction.category_id,

      categoryName: transaction.category?.name ?? 'Sin categoría',

      categoryColor: transaction.category?.color_hex ?? null,

      totalCents: transaction.amount_cents,

      percentage: 0,
    })
  }

  const categories = Array.from(categoryMap.values())
    .map((category) => ({
      ...category,

      percentage:
        totalSpentCents > 0 ? Math.round((category.totalCents / totalSpentCents) * 100) : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)

  const topCategory =
    categories.length > 0
      ? {
          categoryId: categories[0]?.categoryId ?? null,

          categoryName: categories[0]?.categoryName ?? 'Sin categoría',

          totalCents: categories[0]?.totalCents ?? 0,
        }
      : null

  /*
   * Evolución diaria.
   */
  const spentByDate = new Map<string, number>()

  for (const transaction of transactions) {
    const dateKey = format(parseISO(transaction.occurred_at), 'yyyy-MM-dd')

    const current = spentByDate.get(dateKey) ?? 0

    spentByDate.set(dateKey, current + transaction.amount_cents)
  }

  let cumulativeCents = 0

  const daily: DailyStatistic[] = elapsedDates.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd')

    const spentCents = spentByDate.get(dateKey) ?? 0

    cumulativeCents += spentCents

    return {
      date: dateKey,

      spentCents,

      cumulativeCents,
    }
  })

  /*
   * Planeado vs real.
   *
   * La fuente de verdad para saber
   * qué plan pertenece a este ciclo
   * son las transacciones reales del
   * ciclo con planned_expense_id.
   */
  const plannedTransactions = transactions.filter((transaction) =>
    Boolean(transaction.planned_expense_id),
  )

  const plannedIds = Array.from(
    new Set(
      plannedTransactions
        .map((transaction) => transaction.planned_expense_id)
        .filter((value): value is string => Boolean(value)),
    ),
  )

  let planned: PlannedStatistic = {
    completedCount: 0,

    totalPlannedCents: 0,
    totalActualCents: 0,

    differenceCents: 0,
  }

  if (plannedIds.length > 0) {
    const { data: plansData, error: plansError } = await supabase
      .from('planned_expenses')
      .select(
        `
        id,
        amount_cents
      `,
      )
      .in('id', plannedIds)

    if (plansError) {
      throw plansError
    }

    const plans = plansData as PlannedExpenseRow[]

    const actualByPlan = new Map<string, number>()

    for (const transaction of plannedTransactions) {
      if (!transaction.planned_expense_id) {
        continue
      }

      const current = actualByPlan.get(transaction.planned_expense_id) ?? 0

      actualByPlan.set(transaction.planned_expense_id, current + transaction.amount_cents)
    }

    const totalPlannedCents = plans.reduce((total, plan) => total + plan.amount_cents, 0)

    const totalActualCents = plans.reduce(
      (total, plan) => total + (actualByPlan.get(plan.id) ?? 0),
      0,
    )

    planned = {
      completedCount: plans.length,

      totalPlannedCents,

      totalActualCents,

      differenceCents: totalPlannedCents - totalActualCents,
    }
  }

  return {
    cycleId: cycle.id,

    cycleStartDate: cycle.start_date,

    cycleEndDate: cycle.end_date,

    elapsedDays,

    totalSpentCents,
    expenseCount,
    dailyAverageCents,

    topCategory,

    categories,
    daily,
    planned,
  }
}
