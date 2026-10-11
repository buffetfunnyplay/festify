import { repo } from '../services/repository'
import { clientListUrl, copyText, hasPublicUrl, NO_PUBLIC_URL_MSG } from '../lib/utils'

/** Copia o link privado da lista de confirmados para enviar ao cliente (pai/mãe) */
export async function copyClientLink(party, toast) {
  if (!hasPublicUrl()) return toast(NO_PUBLIC_URL_MSG, 'info', 5000)
  let token = party.clientToken
  if (!token) token = (await repo.saveParty({ ...party })).clientToken // convites antigos sem token
  const ok = await copyText(clientListUrl(token))
  toast(ok ? 'Link da lista do cliente copiado! 🔒' : 'Não foi possível copiar', ok ? 'success' : 'error')
}
