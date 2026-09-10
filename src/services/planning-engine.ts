import { format, getISODay } from 'date-fns'

import { es } from 'date-fns/locale'

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

export interface RoutineRule {
  category_id: string | null
  weekday: number
  title: string

  normal_amount_cents: number
  max_amount_cents: number
}

export function calculateRisk(
  distributableCents: number,
  essentialDistributableCents: number,
  routineNeedCents: number,
): {
  score: number
  level: RiskLevel
} {
  if (essentialDistributableCents < 0) {
    return {
      score: 95,
      level: 'high',
    }
  }

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

export function calculateDailyPlan(
  dates: Date[],
  routines: RoutineRule[],
  distributableCents: number,
  categoryBudgetRemaining: Map<string, number>,
): DailyPlanPreview[] {
  const routineMap = new Map(routines.map((routine) => [routine.weekday, routine]))

  const rawDays = dates.map((date) => {
    const weekday = getISODay(date)

    const routine = routineMap.get(weekday)

    const normal = routine?.normal_amount_cents ?? 0

    const maximum = Math.max(routine?.max_amount_cents ?? normal, normal)

    return {
      date,

      categoryId: routine?.category_id ?? null,

      activity: routine?.title ?? 'Día normal',

      normal,
      maximum,
    }
  })

  /*
   * Primera capa:
   * situación financiera general.
   */
  const available = Math.max(distributableCents, 0)

  const totalNormal = rawDays.reduce((total, day) => total + day.normal, 0)

  const totalMargin = rawDays.reduce(
    (total, day) => total + Math.max(day.maximum - day.normal, 0),
    0,
  )

  const normalScale = totalNormal > 0 ? Math.min(available / totalNormal, 1) : 0

  const extraAvailable = Math.max(available - totalNormal, 0)

  const marginScale =
    available > totalNormal && totalMargin > 0 ? Math.min(extraAvailable / totalMargin, 1) : 0

  const calculatedDays = rawDays.map((day) => {
    const recommended = Math.round(day.normal * normalScale)

    const routineMargin = Math.max(day.maximum - day.normal, 0)

    const allowedExtra = Math.round(routineMargin * marginScale)

    const maximumRecommended = Math.min(day.maximum, recommended + allowedExtra)

    return {
      ...day,
      recommended,
      maximumRecommended,
    }
  })

  /*
   * Segunda capa:
   * presupuesto de categoría
   * utilizado únicamente como techo.
   */
  const indexesByCategory = new Map<string, number[]>()

  calculatedDays.forEach((day, index) => {
    if (!day.categoryId) {
      return
    }

    if (!categoryBudgetRemaining.has(day.categoryId)) {
      return
    }

    const indexes = indexesByCategory.get(day.categoryId) ?? []

    indexes.push(index)

    indexesByCategory.set(day.categoryId, indexes)
  })

  for (const [categoryId, indexes] of indexesByCategory) {
    const remainingBudget = Math.max(categoryBudgetRemaining.get(categoryId) ?? 0, 0)

    const totalRecommended = indexes.reduce((total, index) => {
      const day = calculatedDays[index]

      return total + (day?.recommended ?? 0)
    }, 0)

    if (totalRecommended > remainingBudget) {
      const scale = totalRecommended > 0 ? remainingBudget / totalRecommended : 0

      for (const index of indexes) {
        const day = calculatedDays[index]

        if (!day) {
          continue
        }

        const adjusted = Math.floor(day.recommended * scale)

        day.recommended = adjusted

        day.maximumRecommended = adjusted
      }

      continue
    }

    const budgetForExtras = Math.max(remainingBudget - totalRecommended, 0)

    const totalExtras = indexes.reduce((total, index) => {
      const day = calculatedDays[index]

      if (!day) {
        return total
      }

      return total + Math.max(day.maximumRecommended - day.recommended, 0)
    }, 0)

    const extraScale = totalExtras > 0 ? Math.min(budgetForExtras / totalExtras, 1) : 0

    for (const index of indexes) {
      const day = calculatedDays[index]

      if (!day) {
        continue
      }

      const extra = Math.max(day.maximumRecommended - day.recommended, 0)

      const adjustedExtra = Math.floor(extra * extraScale)

      day.maximumRecommended = day.recommended + adjustedExtra
    }
  }

  return calculatedDays.map((day) => ({
    date: format(day.date, 'yyyy-MM-dd'),

    label: format(day.date, "EEE d 'de' MMM", {
      locale: es,
    }),

    activity: day.activity,

    routineNormalCents: day.normal,

    routineMaxCents: day.maximum,

    recommendedCents: day.recommended,

    maximumRecommendedCents: Math.max(day.recommended, day.maximumRecommended),
  }))
}