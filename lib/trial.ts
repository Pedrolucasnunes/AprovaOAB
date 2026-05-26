export type TrialUser = {
  plano: "free" | "pro" | "aprovacao"
  trial_used: boolean
  subscription_status: "active" | "trialing" | "past_due" | "canceled"
  trial_ends_at: string | null
}

export type TrialState =
  | { type: "eligible" }
  | { type: "in_trial"; endsAt: Date; daysLeft: number }
  | { type: "not_eligible" }

export function isTrialEnabled(): boolean {
  return process.env.TRIAL_ENABLED === "true"
}

export function isTrialEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_TRIAL_ENABLED === "true"
}

export function getTrialState(user: TrialUser, enabled: boolean): TrialState {
  if (user.subscription_status === "trialing" && user.trial_ends_at) {
    const endsAt = new Date(user.trial_ends_at)
    const msLeft = endsAt.getTime() - Date.now()
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000))
    return { type: "in_trial", endsAt, daysLeft }
  }

  if (!enabled) return { type: "not_eligible" }
  if (user.plano !== "free") return { type: "not_eligible" }
  if (user.trial_used) return { type: "not_eligible" }
  return { type: "eligible" }
}

export const TRIAL_DAYS = 7
