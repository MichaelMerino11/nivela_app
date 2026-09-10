import { supabase } from '@/services/supabase'

import {
  calculateExpenseStatistics,
  calculatePlannedStatistics,
  type StatisticsExpenseInput,
  type StatisticsPlanInput,
} from '@/services/statistics-engine'

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
   * Estadísticas del ciclo activo.
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
   * Gastos reales del ciclo.
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

  const rows = transactionsData as unknown as ExpenseTransactionRow[]

  const transactions: StatisticsExpenseInput[] = rows.map((transaction) => ({
    categoryId: transaction.category_id,

    categoryName: transaction.category?.name ?? 'Sin categoría',

    categoryColor: transaction.category?.color_hex ?? null,

    amountCents: transaction.amount_cents,

    occurredAt: transaction.occurred_at,

    plannedExpenseId: transaction.planned_expense_id,
  }))

  const calculated = calculateExpenseStatistics(cycle.start_date, cycle.end_date, transactions)

  let planned: PlannedStatistic = {
    completedCount: 0,
    totalPlannedCents: 0,
    totalActualCents: 0,
    differenceCents: 0,
  }

  /*
   * Solo consultamos los planes
   * que aparecen realmente en
   * movimientos de este ciclo.
   */
  if (calculated.plannedIds.length > 0) {
    const { data: plansData, error: plansError } = await supabase
      .from('planned_expenses')
      .select(
        `
        id,
        amount_cents
        `,
      )
      .in('id', calculated.plannedIds)

    if (plansError) {
      throw plansError
    }

    const planRows = plansData as PlannedExpenseRow[]

    const plans: StatisticsPlanInput[] = planRows.map((plan) => ({
      id: plan.id,
      amountCents: plan.amount_cents,
    }))

    planned = calculatePlannedStatistics(transactions, plans)
  }

  return {
    cycleId: cycle.id,

    cycleStartDate: cycle.start_date,

    cycleEndDate: cycle.end_date,

    elapsedDays: calculated.elapsedDays,

    totalSpentCents: calculated.totalSpentCents,

    expenseCount: calculated.expenseCount,

    dailyAverageCents: calculated.dailyAverageCents,

    topCategory: calculated.topCategory,

    categories: calculated.categories,

    daily: calculated.daily,

    planned,
  }
}
