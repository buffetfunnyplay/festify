// ────────────────────────────────────────────────────────────
// Ajudantes de login (Google e nome do buffet + senha)
// ────────────────────────────────────────────────────────────
import { Capacitor } from '@capacitor/core'
import { slugify } from './utils'

/** Endereço que o Android abre de volta no app depois do login com Google */
export const APP_SCHEME = 'app.festify.convites://'
export const NATIVE_REDIRECT = `${APP_SCHEME}login`

/** Programa do Windows (Electron) — lá o login é só com nome do buffet + senha */
export const isDesktopApp = () => typeof location !== 'undefined' && location.protocol === 'app:'

/** Para onde o Google devolve a pessoa depois do login */
export function oauthRedirectUrl() {
  if (Capacitor.isNativePlatform()) return NATIVE_REDIRECT
  const url = new URL(window.location.href)
  url.search = '?admin=1'
  url.hash = ''
  return url.toString()
}

/** "Buffet Magia & Farra" → "buffet-magia-farra" (vira o endereço da biblioteca) */
export const buffetHandle = (name = '') => slugify(name).slice(0, 40).replace(/-+$/, '')

/**
 * Login por nome + senha usa um e-mail interno (nunca recebe mensagens).
 * Requer "Confirm email" DESLIGADO no Supabase.
 */
export const passwordLoginEmail = (handle) => `${handle}@buffet.festify.app`
