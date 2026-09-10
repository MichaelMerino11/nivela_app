export interface SavingsProgress {
  savedCents: number
  remainingCents: number
  exceededCents: number
  progressPercentage: number
}

export function calculateSavingsProgress(
  targetCents: number,
  contributions: Array<{
    amountCents: number
  }>,
): SavingsProgress {
  const savedCents = contributions.reduce(
    (total, contribution) => total + contribution.amountCents,
    0,
  )

  const remainingCents = Math.max(targetCents - savedCents, 0)

  const exceededCents = Math.max(savedCents - targetCents, 0)

  const progressPercentage = targetCents > 0 ? Math.round((savedCents / targetCents) * 100) : 0

  return {
    savedCents,
    remainingCents,
    exceededCents,
    progressPercentage,
  }
}