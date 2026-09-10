import { eachDayOfInterval, format, isAfter, parseISO, startOfDay } from 'date-fns'

export interface StatisticsExpenseInput {
  categoryId: string | null
  categoryName: string
  categoryColor: string | null

  amountCents: number
  occurredAt: string

  plannedExpenseId: string | null
}

export interface StatisticsPlanInput {
  id: string
  amountCents: number
}

export interface CalculatedCategoryStatistic {
  categoryId: string | null
  categoryName: string
  categoryColor: string | null
  totalCents: number
  percentage: number
}

export interface CalculatedDailyStatistic {
  date: string
  spentCents: number
  cumulativeCents: number
}

export interface CalculatedTopCategoryStatistic {
  categoryId: string | null
  categoryName: string
  totalCents: number
}

export interface CalculatedPlannedStatistic {
  completedCount: number
  totalPlannedCents: number
  totalActualCents: number
  differenceCents: number
}

export interface CalculatedExpenseStatistics {
  elapsedDays: number
  totalSpentCents: number
  expenseCount: number
  dailyAverageCents: number

  topCategory: CalculatedTopCategoryStatistic | null

  categories: CalculatedCategoryStatistic[]

  daily: CalculatedDailyStatistic[]

  plannedIds: string[]
}

export function calculateExpenseStatistics(
  cycleStartDate: string,
  cycleEndDate: string,
  transactions: StatisticsExpenseInput[],
  currentDate: Date = new Date(),
): CalculatedExpenseStatistics {
  const totalSpentCents = transactions.reduce(
    (total, transaction) => total + transaction.amountCents,
    0,
  )

  const expenseCount = transactions.length

  /*
   * El promedio usa todos los días
   * transcurridos del ciclo, incluso
   * aquellos donde no hubo gastos.
   */
  const cycleStart = parseISO(cycleStartDate)

  const cycleEnd = parseISO(cycleEndDate)

  const today = startOfDay(currentDate)

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
   * Agrupación por categoría.
   */
  const categoryMap = new Map<string, CalculatedCategoryStatistic>()

  for (const transaction of transactions) {
    const mapKey = transaction.categoryId ?? '__uncategorized__'

    const current = categoryMap.get(mapKey)

    if (current) {
      current.totalCents += transaction.amountCents

      continue
    }

    categoryMap.set(mapKey, {
      categoryId: transaction.categoryId,

      categoryName: transaction.categoryName,

      categoryColor: transaction.categoryColor,

      totalCents: transaction.amountCents,

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
   * Evolución diaria acumulada.
   */
  const spentByDate = new Map<string, number>()

  for (const transaction of transactions) {
    const dateKey = format(parseISO(transaction.occurredAt), 'yyyy-MM-dd')

    const current = spentByDate.get(dateKey) ?? 0

    spentByDate.set(dateKey, current + transaction.amountCents)
  }

  let cumulativeCents = 0

  const daily = elapsedDates.map((date) => {
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
   * IDs de planes que realmente
   * tienen movimientos en este ciclo.
   */
  const plannedIds = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.plannedExpenseId)
        .filter((value): value is string => Boolean(value)),
    ),
  )

  return {
    elapsedDays,
    totalSpentCents,
    expenseCount,
    dailyAverageCents,
    topCategory,
    categories,
    daily,
    plannedIds,
  }
}

export function calculatePlannedStatistics(
  transactions: StatisticsExpenseInput[],
  plans: StatisticsPlanInput[],
): CalculatedPlannedStatistic {
  const actualByPlan = new Map<string, number>()

  for (const transaction of transactions) {
    if (!transaction.plannedExpenseId) {
      continue
    }

    const current = actualByPlan.get(transaction.plannedExpenseId) ?? 0

    actualByPlan.set(transaction.plannedExpenseId, current + transaction.amountCents)
  }

  const totalPlannedCents = plans.reduce((total, plan) => total + plan.amountCents, 0)

  const totalActualCents = plans.reduce(
    (total, plan) => total + (actualByPlan.get(plan.id) ?? 0),
    0,
  )

  return {
    completedCount: plans.length,

    totalPlannedCents,

    totalActualCents,

    differenceCents: totalPlannedCents - totalActualCents,
  }
}