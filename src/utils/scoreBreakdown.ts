/**
 * Score = Base × Qty × K_type × K_drones × K_rework
 */
export function calculateScore(
  base: number,
  quantity: number,
  kType: number,
  kDrones: number,
  kRework: number
): number {
  return base * quantity * kType * kDrones * kRework
}
