import { supabase } from '@/services/supabase'

export type BudgetStatus = 'none' | 'normal' | 'warning' | 'exceeded'

export interface CategoryBudgetSummary {
  categoryId: string

  categoryName: string
  categorySlug: string
  categoryIcon: string | null
  categoryColor: string | null

  budgetId: string | null

  limitCents: number | null
  spentCents: number
  remainingCents: number | null

  warningPercentage: number
  percentageUsed: number

  status: BudgetStatus
}

export interface BudgetOverview {
  cycleId: string
  cycleStartDate: string
  cycleEndDate: string

  totalLimitCents: number
  totalSpentCents: number
  totalRemainingCents: number

  categories: CategoryBudgetSummary[]
}

export interface SaveCategoryBudgetInput {
  categoryId: string
  limitCents: number
  warningPercentage?: number
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon: string | null
  color_hex: string | null
}

interface BudgetRow {
  id: string
  category_id: string
  limit_cents: number
  warning_percentage: number
}

interface TransactionRow {
  category_id: string | null
  amount_cents: number
}

export async function getBudgetOverview(): Promise<BudgetOverview> {
  /*
   * Primero obtenemos el ciclo activo.
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
   * Después cargamos en paralelo:
   *
   * - categorías
   * - presupuestos activos
   * - gastos reales del ciclo
   */
  const [categoriesResponse, budgetsResponse, transactionsResponse] = await Promise.all([
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
      .from('category_budgets')
      .select(
        `
        id,
        category_id,
        limit_cents,
        warning_percentage
      `,
      )
      .eq('active', true),

    supabase
      .from('transactions')
      .select(
        `
        category_id,
        amount_cents
      `,
      )
      .eq('cycle_id', cycle.id)
      .eq('kind', 'expense'),
  ])

  if (categoriesResponse.error) {
    throw categoriesResponse.error
  }

  if (budgetsResponse.error) {
    throw budgetsResponse.error
  }

  if (transactionsResponse.error) {
    throw transactionsResponse.error
  }

  const categories = categoriesResponse.data as CategoryRow[]

  const budgets = budgetsResponse.data as BudgetRow[]

  const transactions = transactionsResponse.data as TransactionRow[]

  /*
   * Presupuesto configurado por categoría.
   */
  const budgetMap = new Map<string, BudgetRow>()

  for (const budget of budgets) {
    budgetMap.set(budget.category_id, budget)
  }

  /*
   * Total realmente gastado por categoría
   * durante el ciclo actual.
   */
  const spentMap = new Map<string, number>()

  for (const transaction of transactions) {
    if (!transaction.category_id) {
      continue
    }

    const current = spentMap.get(transaction.category_id) ?? 0

    spentMap.set(transaction.category_id, current + transaction.amount_cents)
  }

  const categorySummaries = categories.map((category): CategoryBudgetSummary => {
    const budget = budgetMap.get(category.id)

    const spentCents = spentMap.get(category.id) ?? 0

    /*
     * Categoría sin presupuesto.
     *
     * Igual la devolvemos porque
     * podremos configurarla desde
     * la pantalla.
     */
    if (!budget) {
      return {
        categoryId: category.id,

        categoryName: category.name,

        categorySlug: category.slug,

        categoryIcon: category.icon,

        categoryColor: category.color_hex,

        budgetId: null,

        limitCents: null,

        spentCents,

        remainingCents: null,

        warningPercentage: 80,

        percentageUsed: 0,

        status: 'none',
      }
    }

    const limitCents = budget.limit_cents

    const remainingCents = limitCents - spentCents

    let percentageUsed = 0

    if (limitCents > 0) {
      percentageUsed = Math.round((spentCents / limitCents) * 100)
    } else if (spentCents > 0) {
      percentageUsed = 100
    }

    let status: BudgetStatus = 'normal'

    if (spentCents > limitCents) {
      status = 'exceeded'
    } else if (percentageUsed >= budget.warning_percentage) {
      status = 'warning'
    }

    return {
      categoryId: category.id,

      categoryName: category.name,

      categorySlug: category.slug,

      categoryIcon: category.icon,

      categoryColor: category.color_hex,

      budgetId: budget.id,

      limitCents,

      spentCents,

      remainingCents,

      warningPercentage: budget.warning_percentage,

      percentageUsed,

      status,
    }
  })

  const configuredCategories = categorySummaries.filter((category) => category.limitCents !== null)

  const totalLimitCents = configuredCategories.reduce(
    (total, category) => total + (category.limitCents ?? 0),
    0,
  )

  /*
   * Para el resumen general contamos
   * solamente gasto perteneciente a
   * categorías que tienen presupuesto.
   */
  const totalSpentCents = configuredCategories.reduce(
    (total, category) => total + category.spentCents,
    0,
  )

  return {
    cycleId: cycle.id,

    cycleStartDate: cycle.start_date,

    cycleEndDate: cycle.end_date,

    totalLimitCents,

    totalSpentCents,

    totalRemainingCents: totalLimitCents - totalSpentCents,

    categories: categorySummaries,
  }
}

export async function saveCategoryBudget(input: SaveCategoryBudgetInput): Promise<string> {
  if (!input.categoryId) {
    throw new Error('Selecciona una categoría.')
  }

  if (!Number.isInteger(input.limitCents) || input.limitCents < 0) {
    throw new Error('El presupuesto no es válido.')
  }

  const warningPercentage = input.warningPercentage ?? 80

  if (!Number.isInteger(warningPercentage) || warningPercentage < 1 || warningPercentage > 100) {
    throw new Error('La alerta debe estar entre 1 y 100.')
  }

  const { data, error } = await supabase.rpc('save_category_budget', {
    p_category_id: input.categoryId,

    p_limit_cents: input.limitCents,

    p_warning_percentage: warningPercentage,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo guardar el presupuesto.')
  }

  return data as string
}

export async function disableCategoryBudget(budgetId: string): Promise<void> {
  if (!budgetId) {
    throw new Error('Presupuesto inválido.')
  }

  const { error } = await supabase.rpc('disable_category_budget', {
    p_budget_id: budgetId,
  })

  if (error) {
    throw error
  }
}