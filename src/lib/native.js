// ────────────────────────────────────────────────────────────
// Integração com o app Android (Capacitor). No navegador tudo
// aqui vira no-op e o comportamento web padrão é mantido.
// ────────────────────────────────────────────────────────────
import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()

/** App instalado (APK Android ou programa do Windows) — não é uma página da web */
export const isAppShell = () => isNative() || (typeof location !== 'undefined' && location.protocol === 'app:')

// Pilha de "fechar" dos modais abertos — o botão Voltar do Android fecha o modal do topo
const closeStack = []
export function pushBackHandler(fn) {
  closeStack.push(fn)
  return () => {
    const i = closeStack.lastIndexOf(fn)
    if (i >= 0) closeStack.splice(i, 1)
  }
}

export async function setupNative() {
  if (!isNative()) return
  document.documentElement.classList.add('is-native')
  const { App } = await import('@capacitor/app')
  App.addListener('backButton', async () => {
    if (closeStack.length) return closeStack[closeStack.length - 1]()
    const { canGoBack } = await import('../hooks/useRoute')
    if (canGoBack()) window.history.back()
    else App.exitApp()
  })
}

/** Salva um arquivo (base64) no cache do app e abre a folha de compartilhamento */
export async function shareFile(filename, base64, title) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ])
  const { uri } = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache })
  await Share.share({ title, dialogTitle: title, files: [uri] })
}

/** Compartilha texto pelo seletor nativo (WhatsApp, Telegram, e-mail...) */
export async function shareText(text, title = 'Festify') {
  const { Share } = await import('@capacitor/share')
  await Share.share({ title, text, dialogTitle: title })
}

/** Abre WhatsApp: no app usa o compartilhamento nativo; na web, wa.me */
export async function sendWhatsApp(text) {
  if (isNative()) {
    try {
      await shareText(text)
      return
    } catch {
      /* usuário cancelou ou falhou: cai no link */
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
