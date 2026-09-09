import { supabase } from '@/services/supabase'

export interface PlannedHistoryItem {
  id: string

  name: string

  plannedDate: string
  paidAt: string | null

  categoryName: string

  plannedAmountCents: number
  actualAmountCents: number

  differenceCents: number

  isExceptional: boolean

  hasPayment: boolean
}

export interface PlannedHistorySummary {
  items: PlannedHistoryItem[]

  completedCount: number

  totalPlannedCents: number
  totalActualCents: number

  differenceCents: number
}

interface PaidPlanRow {
  id: string
  name: string

  category_id: string | null

  amount_cents: number
  planned_date: string

  is_exceptional: boolean
}

interface PaymentRow {
  planned_expense_id: string | null

  category_id: string | null

  amount_cents: number
  occurred_at: string
}

interface CategoryRow {
  id: string
  name: string
}

export async function getPlannedHistory(): Promise<PlannedHistorySummary> {
  /*
   * Primero obtenemos los gastos
   * planificados que ya fueron pagados.
   */
  const { data: plansData, error: plansError } = await supabase
    .from('planned_expenses')
    .select(
      `
      id,
      name,
      category_id,
      amount_cents,
      planned_date,
      is_exceptional
    `,
    )
    .eq('status', 'paid')
    .order('updated_at', {
      ascending: false,
    })

  if (plansError) {
    throw plansError
  }

  const plans = plansData as PaidPlanRow[]

  if (plans.length === 0) {
    return {
      items: [],

      completedCount: 0,

      totalPlannedCents: 0,
      totalActualCents: 0,

      differenceCents: 0,
    }
  }

  const planIds = plans.map((plan) => plan.id)

  /*
   * Buscamos los movimientos reales
   * que nacieron de esos planes.
   */
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('transactions')
    .select(
      `
      planned_expense_id,
      category_id,
      amount_cents,
      occurred_at
    `,
    )
    .eq('kind', 'expense')
    .in('planned_expense_id', planIds)

  if (paymentsError) {
    throw paymentsError
  }

  const payments = paymentsData as PaymentRow[]

  /*
   * Recopilamos categorías tanto
   * del plan como del movimiento real.
   */
  const categoryIds = Array.from(
    new Set(
      [
        ...plans.map((plan) => plan.category_id),

        ...payments.map((payment) => payment.category_id),
      ].filter((value): value is string => Boolean(value)),
    ),
  )

  const categoryMap = new Map<string, string>()

  if (categoryIds.length > 0) {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select(
        `
        id,
        name
      `,
      )
      .in('id', categoryIds)

    if (categoriesError) {
      throw categoriesError
    }

    for (const category of categoriesData as CategoryRow[]) {
      categoryMap.set(category.id, category.name)
    }
  }

  /*
   * Aunque actualmente cada plan
   * genera una sola transacción,
   * lo dejamos preparado para poder
   * sumar varias en el futuro.
   */
  const paymentMap = new Map<
    string,
    {
      amountCents: number
      occurredAt: string
      categoryId: string | null
    }
  >()

  for (const payment of payments) {
    if (!payment.planned_expense_id) {
      continue
    }

    const current = paymentMap.get(payment.planned_expense_id)

    if (!current) {
      paymentMap.set(payment.planned_expense_id, {
        amountCents: payment.amount_cents,

        occurredAt: payment.occurred_at,

        categoryId: payment.category_id,
      })

      continue
    }

    current.amountCents += payment.amount_cents

    if (payment.occurred_at > current.occurredAt) {
      current.occurredAt = payment.occurred_at

      current.categoryId = payment.category_id
    }
  }

  const items: PlannedHistoryItem[] = plans.map((plan) => {
    const payment = paymentMap.get(plan.id)

    const actualAmountCents = payment?.amountCents ?? 0

    const categoryId = payment?.categoryId ?? plan.category_id

    return {
      id: plan.id,

      name: plan.name,

      plannedDate: plan.planned_date,

      paidAt: payment?.occurredAt ?? null,

      categoryName: categoryId ? (categoryMap.get(categoryId) ?? 'Sin categoría') : 'Sin categoría',

      plannedAmountCents: plan.amount_cents,

      actualAmountCents,

      /*
       * Positivo:
       * gastamos menos.
       *
       * Negativo:
       * gastamos más.
       */
      differenceCents: plan.amount_cents - actualAmountCents,

      isExceptional: plan.is_exceptional,

      hasPayment: Boolean(payment),
    }
  })

  const totalPlannedCents = items.reduce((total, item) => total + item.plannedAmountCents, 0)

  const totalActualCents = items.reduce((total, item) => total + item.actualAmountCents, 0)

  return {
    items,

    completedCount: items.length,

    totalPlannedCents,

    totalActualCents,

    differenceCents: totalPlannedCents - totalActualCents,
  }
}