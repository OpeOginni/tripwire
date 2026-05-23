export function scoreTier(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high"
  if (score >= 41) return "mid"
  return "low"
}
