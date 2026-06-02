export type ConsentPreferences = {
  analytics: boolean
  marketing: boolean
}

export type StoredConsent = ConsentPreferences & {
  timestamp: string
}

const STORAGE_KEY = "aprovaoab_consent_v1"

// Análise é ligada por padrão (legítimo interesse / opt-out — métricas anônimas).
// Marketing continua exigindo consentimento explícito (opt-in).
export const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: true,
  marketing: false,
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function getStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConsent
    if (
      typeof parsed?.analytics !== "boolean" ||
      typeof parsed?.marketing !== "boolean" ||
      typeof parsed?.timestamp !== "string"
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function setStoredConsent(prefs: ConsentPreferences): StoredConsent {
  const record: StoredConsent = {
    ...prefs,
    timestamp: new Date().toISOString(),
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  }
  return record
}

export function pushConsentUpdate(prefs: ConsentPreferences): void {
  if (typeof window === "undefined") return
  window.dataLayer = window.dataLayer || []
  const gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args)
  }
  gtag("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.marketing ? "granted" : "denied",
    ad_user_data: prefs.marketing ? "granted" : "denied",
    ad_personalization: prefs.marketing ? "granted" : "denied",
  })
}

export const OPEN_PREFS_EVENT = "open-cookie-prefs"
