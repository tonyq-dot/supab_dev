/**
 * Bonus = (B × 0.7 × Q1) + (B × 0.3 × Ki)
 * B = monthly salary, Ki = totalPoints / normPoints
 */
export function calculateBonus(
  totalPoints: number,
  monthlySalary: number,
  normPoints: number,
  companyProfitCoefQ1: number
): number {
  const ki = totalPoints / normPoints
  const teamPart = monthlySalary * 0.7 * companyProfitCoefQ1
  const individualPart = monthlySalary * 0.3 * ki
  return Math.round((teamPart + individualPart) * 100) / 100
}
