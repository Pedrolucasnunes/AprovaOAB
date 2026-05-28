"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_PREFERENCES,
  OPEN_PREFS_EVENT,
  type ConsentPreferences,
  getStoredConsent,
  pushConsentUpdate,
  setStoredConsent,
} from "@/lib/consent"

const ALL_GRANTED: ConsentPreferences = { analytics: true, marketing: true }
const ALL_DENIED: ConsentPreferences = { analytics: false, marketing: false }

export function CookieBanner() {
  const [bannerOpen, setBannerOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [prefs, setPrefs] = useState<ConsentPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    const stored = getStoredConsent()
    if (stored) {
      setPrefs({ analytics: stored.analytics, marketing: stored.marketing })
    } else {
      setBannerOpen(true)
    }

    const handleOpenPrefs = () => {
      const current = getStoredConsent()
      if (current) {
        setPrefs({ analytics: current.analytics, marketing: current.marketing })
      }
      setPrefsOpen(true)
    }
    window.addEventListener(OPEN_PREFS_EVENT, handleOpenPrefs)
    return () => window.removeEventListener(OPEN_PREFS_EVENT, handleOpenPrefs)
  }, [])

  const persist = useCallback((next: ConsentPreferences) => {
    setStoredConsent(next)
    pushConsentUpdate(next)
    setPrefs(next)
    setBannerOpen(false)
    setPrefsOpen(false)
  }, [])

  const acceptAll = () => persist(ALL_GRANTED)
  const rejectAll = () => persist(ALL_DENIED)
  const savePrefs = () => persist(prefs)

  return (
    <>
      {bannerOpen && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              <p>
                Usamos cookies para analisar o uso da plataforma e melhorar sua experiência.
                Você pode aceitar todos, recusar ou personalizar suas escolhas. Leia mais na{" "}
                <Link href="/politica-de-privacidade" className="text-primary underline-offset-4 hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="ghost" size="sm" onClick={rejectAll}>
                Recusar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPrefsOpen(true)}>
                Personalizar
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={prefsOpen} onOpenChange={setPrefsOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Preferências de cookies</SheetTitle>
            <SheetDescription>
              Escolha quais categorias de cookies você autoriza. Cookies essenciais para o
              funcionamento da plataforma estão sempre ativos.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <div className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Essenciais</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Necessários para autenticação, segurança e funcionamento básico. Não podem
                    ser desativados.
                  </p>
                </div>
                <Switch checked disabled aria-label="Cookies essenciais (sempre ativos)" />
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="consent-analytics" className="text-sm font-semibold text-foreground">
                    Análise
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Métricas anônimas de uso (Google Analytics) para entender quais funcionalidades
                    ajudam mais na sua preparação.
                  </p>
                </div>
                <Switch
                  id="consent-analytics"
                  checked={prefs.analytics}
                  onCheckedChange={(checked) =>
                    setPrefs((p) => ({ ...p, analytics: checked }))
                  }
                  className="cursor-pointer hover:brightness-110"
                />
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="consent-marketing" className="text-sm font-semibold text-foreground">
                    Marketing
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Personalização de campanhas e remarketing. Atualmente não utilizamos, mas
                    sua escolha é registrada para o futuro.
                  </p>
                </div>
                <Switch
                  id="consent-marketing"
                  checked={prefs.marketing}
                  onCheckedChange={(checked) =>
                    setPrefs((p) => ({ ...p, marketing: checked }))
                  }
                  className="cursor-pointer hover:brightness-110"
                />
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button onClick={savePrefs}>Salvar preferências</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
