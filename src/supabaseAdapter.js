// ────────────────────────────────────────────────────────────
// Adapter Supabase (multi-buffet). Mesmo contrato do localAdapter.
// Estrutura e permissões: supabase/schema.sql
//
// Login:
//   • Google (Gmail) — no APK abre o navegador do sistema e volta
//     pelo link app.festify.convites://login (o Google não permite
//     login dentro de WebView).
//   • Nome do buffet + senha — usado no programa do Windows.
// Todo acesso novo fica "pendente" até o dono da plataforma liberar.
// ────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { uid } from '../lib/utils'
import { passwordLoginEmail, oauthRedirectUrl, buffetHandle, APP_SCHEME } from '../lib/auth'

const BUCKET = 'festify'
const POLL_MS = 8000

export function createSupabaseAdapter({ url, anonKey }) {
  const native = Capacitor.isNativePlatform()
  const sb = createClient(url, anonKey, {
    auth: {
      persistSession: true, // login fica salvo no aparelho
      autoRefreshToken: true,
      storageKey: 'festify-auth',
      flowType: 'pkce',
      detectSessionInUrl: !native,
    },
  })

  const bus = new EventTarget()
  const emit = (type, partyId) => bus.dispatchEvent(new CustomEvent('change', { detail: { type, partyId } }))
  const authBus = new EventTarget()
  const authError = (msg) => authBus.dispatchEvent(new CustomEvent('error', { detail: msg }))

  const must = ({ data, error }) => {
    if (error) throw new Error(translateError(error))
    return data
  }

  // ── Conta logada ──
  let accountCache = null
  let accountPromise = null
  const isActive = (a) => a?.member?.status === 'active' && a?.buffet?.status === 'active'
  const buffetId = () => (isActive(accountCache) ? accountCache.buffet.id : null)

  async function loadAccount() {
    const { data } = await sb.auth.getSession()
    if (!data.session) {
      accountCache = null
      stopRealtime()
      return null
    }
    accountCache = must(await sb.rpc('my_account'))
    if (isActive(accountCache)) ensureRealtime()
    return accountCache
  }
  function getAccountShared() {
    accountPromise = accountPromise || loadAccount().finally(() => (accountPromise = null))
    return accountPromise
  }
  /** Garante que já sabemos qual é o buffet logado */
  async function requireBuffet() {
    if (!accountCache) await getAccountShared()
    const id = buffetId()
    if (!id) throw new Error('Seu acesso ainda não foi liberado.')
    return id
  }

  // ── Conversões ──
  const toParty = (row) =>
    row && {
      ...row.data,
      id: row.id,
      slug: row.slug,
      buffetId: row.buffet_id,
      clientToken: row.client_token,
      buffet: row.buffet,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  const toTheme = (row) =>
    row && { ...row.data, id: row.id, slug: row.slug, buffetId: row.buffet_id, createdAt: row.created_at, updatedAt: row.updated_at }
  const toRsvp = (r) => ({
    id: r.id,
    partyId: r.party_id,
    name: r.name,
    adults: r.adults,
    children: r.children,
    guests: Array.isArray(r.guests) ? r.guests : [],
    message: r.message || '',
    createdAt: r.created_at,
  })
  const toBuffet = (b) => b && { id: b.id, handle: b.handle, name: b.name, status: b.status, data: b.data || {} }

  // ── Retorno do login com Google no APK ──
  const handledLinks = new Set()
  async function handleAppLink(link) {
    if (!link?.startsWith(APP_SCHEME) || handledLinks.has(link)) return
    handledLinks.add(link)
    try {
      const u = new URL(link.replace(APP_SCHEME, 'https://app/'))
      const params = new URLSearchParams(u.search || u.hash.replace(/^#/, ''))
      const err = params.get('error_description') || params.get('error')
      if (err) throw new Error(err.replace(/\+/g, ' '))
      const code = params.get('code')
      if (code && !(await sb.auth.getSession()).data.session) must(await sb.auth.exchangeCodeForSession(code))
    } catch (e) {
      authError(translateError(e))
    } finally {
      import('@capacitor/browser').then(({ Browser }) => Browser.close().catch(() => {}))
    }
  }
  if (native) {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url: link }) => handleAppLink(link))
      // App foi fechado pelo Android enquanto o login estava aberto → chega pelo link de abertura
      App.getLaunchUrl()
        .then((r) => r?.url && handleAppLink(r.url))
        .catch(() => {})
      // Voltou para o app (ex.: depois de abrir o WhatsApp) → atualiza tudo
      App.addListener('resume', () => emit('poll'))
    })
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      accountCache = null
      stopRealtime()
    }
    // Limpa ?code= da barra de endereço depois do login na web
    if (!native && event === 'SIGNED_IN' && /[?&]code=/.test(window.location.search)) {
      const params = new URLSearchParams(window.location.search)
      params.delete('code')
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString() || 'admin=1'}`)
    }
  })

  // Erro devolvido pelo Google na web (?error_description=...)
  if (!native && typeof window !== 'undefined') {
    const err = new URLSearchParams(window.location.search).get('error_description')
    if (err) setTimeout(() => authError(translateError(err)), 0)
  }

  // ── Tempo real (só para quem está logado) ──
  let channel = null
  function ensureRealtime() {
    if (channel) return
    channel = sb
      .channel('festify-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, (p) => emit('rsvp', p.new?.party_id || p.old?.party_id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, () => emit('party'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'themes' }, () => emit('theme'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buffets' }, () => emit('settings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => emit('account'))
      .subscribe()
  }
  function stopRealtime() {
    if (!channel) return
    sb.removeChannel(channel).catch(() => {})
    channel = null
  }

  // ── Imagens ──
  async function uploadDataUrl(dataUrl, folder) {
    const id = await requireBuffet()
    const blob = await (await fetch(dataUrl)).blob()
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const path = `${id}/${folder}/${uid()}.${ext}`
    must(await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false }))
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }
  async function removeImages(urls = []) {
    const marker = `/object/public/${BUCKET}/`
    const paths = urls.filter((u) => typeof u === 'string' && u.includes(marker)).map((u) => decodeURIComponent(u.split(marker)[1]))
    if (paths.length) await sb.storage.from(BUCKET).remove(paths).catch(() => {})
  }

  const api = {
    name: 'supabase',
    client: sb,
    supportsGoogle: true,
    supportsPassword: true,

    // ── Login ──
    async getSession() {
      return (await sb.auth.getSession()).data.session
    },
    onAuthChange(cb) {
      // setTimeout: o Supabase não permite chamar outras funções dentro deste aviso
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
        setTimeout(() => cb(session), 0)
      })
      return () => data.subscription.unsubscribe()
    },
    onAuthError(cb) {
      const h = (e) => cb(e.detail)
      authBus.addEventListener('error', h)
      return () => authBus.removeEventListener('error', h)
    },
    async signInWithGoogle() {
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: oauthRedirectUrl(), skipBrowserRedirect: native, queryParams: { prompt: 'select_account' } },
      })
      if (error) throw new Error(translateError(error))
      if (native) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url, presentationStyle: 'popover' })
      }
    },
    async signUpWithPassword(buffetName, password) {
      const name = String(buffetName || '').trim()
      const handle = buffetHandle(name)
      if (name.length < 2 || handle.length < 3) throw new Error('Digite o nome completo do buffet (pelo menos 3 letras).')
      if (String(password).length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
      const { data, error } = await sb.auth.signUp({ email: passwordLoginEmail(handle), password })
      if (error) throw new Error(translateError(error))
      if (!data.session) {
        throw new Error('O Supabase pediu confirmação de e-mail. Desligue "Confirm email" (veja o tutorial) e tente de novo.')
      }
      return api.requestAccess(name, 'senha')
    },
    async signInWithPassword(buffetName, password) {
      const handle = buffetHandle(buffetName)
      if (handle.length < 3) throw new Error('Digite o nome do buffet.')
      must(await sb.auth.signInWithPassword({ email: passwordLoginEmail(handle), password }))
      await getAccountShared()
    },
    async signOut() {
      accountCache = null
      stopRealtime()
      await sb.auth.signOut()
    },

    // ── Conta / buffet ──
    async getAccount() {
      return getAccountShared()
    },
    async requestAccess(buffetName, method = 'google') {
      const name = String(buffetName || '').trim()
      const handle = buffetHandle(name)
      if (name.length < 2 || handle.length < 3) throw new Error('Digite o nome do buffet (pelo menos 3 letras).')
      accountCache = must(await sb.rpc('request_access', { p_name: name, p_handle: handle, p_method: method }))
      if (isActive(accountCache)) ensureRealtime()
      emit('account')
      return accountCache
    },
    async cancelRequest() {
      must(await sb.rpc('cancel_request'))
      accountCache = null
      emit('account')
    },

    // ── Painel do dono da plataforma ──
    async adminOverview() {
      return must(await sb.rpc('admin_overview')) || []
    },
    async setMemberStatus(userId, status) {
      must(await sb.rpc('set_member_status', { p_user: userId, p_status: status }))
      emit('account')
    },
    async setBuffetStatus(id, status) {
      must(await sb.rpc('set_buffet_status', { p_buffet: id, p_status: status }))
      emit('account')
    },
    async deleteMember(userId) {
      must(await sb.rpc('delete_member', { p_user: userId }))
      emit('account')
    },

    // ── Imagens ──
    async uploadImage(dataUrl, folder = 'misc') {
      if (!dataUrl?.startsWith('data:')) return dataUrl
      return uploadDataUrl(dataUrl, folder)
    },

    // ── Ajustes do buffet logado ──
    async getSettings() {
      const id = await requireBuffet()
      const b = must(await sb.from('buffets').select('*').eq('id', id).maybeSingle())
      return b ? { ...(b.data || {}), buffetName: b.name, handle: b.handle, buffetId: b.id } : {}
    },
    async saveSettings(settings) {
      const id = await requireBuffet()
      // eslint-disable-next-line no-unused-vars
      const { buffetName, handle, buffetId: _b, ...data } = settings
      for (const key of ['logo', 'bannerImage']) {
        if (data[key]?.startsWith?.('data:')) data[key] = await uploadDataUrl(data[key], 'brand')
      }
      const name = String(buffetName || '').trim()
      must(await sb.from('buffets').update({ name, data, updated_at: new Date().toISOString() }).eq('id', id))
      if (accountCache?.buffet) accountCache = { ...accountCache, buffet: { ...accountCache.buffet, name, data } }
      emit('settings')
      return { ...data, buffetName: name, handle, buffetId: id }
    },

    // ── Público ──
    async getPublicBuffet(handle) {
      if (!handle) return null
      return toBuffet(must(await sb.from('buffets').select('id,handle,name,status,data').eq('handle', handle).maybeSingle()))
    },

    // ── Temas ──
    async listThemes(forBuffetId) {
      const id = forBuffetId || (await requireBuffet())
      const rows = must(await sb.from('themes').select('*').eq('buffet_id', id))
      return rows.map(toTheme).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
    },
    async getTheme(id) {
      return toTheme(must(await sb.from('themes').select('*').eq('id', id).maybeSingle()))
    },
    async getThemeBySlug(slug, forBuffetId) {
      let q = sb.from('themes').select('*').eq('slug', slug)
      if (forBuffetId) q = q.eq('buffet_id', forBuffetId)
      const rows = must(await q.limit(1))
      return toTheme(rows[0])
    },
    async isThemeSlugAvailable(slug, ignoreId) {
      const rows = must(await sb.from('themes').select('id').eq('buffet_id', await requireBuffet()).eq('slug', slug))
      return !rows.some((r) => r.id !== ignoreId)
    },
    async saveTheme(input) {
      const bid = await requireBuffet()
      // eslint-disable-next-line no-unused-vars
      const { id, slug, buffetId: _b, createdAt, updatedAt, ...data } = input
      data.photos = await Promise.all((data.photos || []).map((p) => api.uploadImage(p, 'themes')))
      data.thumbs = await Promise.all((data.thumbs || []).map((p) => api.uploadImage(p, 'themes/thumbs')))
      const row = must(
        await sb.from('themes').upsert({ id: id || uid(), buffet_id: bid, slug, data, updated_at: new Date().toISOString() }).select().single()
      )
      emit('theme')
      return toTheme(row)
    },
    async deleteTheme(id) {
      const theme = await api.getTheme(id)
      must(await sb.from('themes').delete().eq('id', id))
      const used = new Set((await api.listParties()).map((p) => p.coverImage))
      await removeImages([...(theme?.photos || []), ...(theme?.thumbs || [])].filter((u) => !used.has(u)))
      emit('theme')
    },

    // ── Convites ──
    async listParties() {
      const rows = must(await sb.from('parties').select('*').eq('buffet_id', await requireBuffet()))
      return rows.map(toParty).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    },
    async getParty(id) {
      return toParty(must(await sb.from('parties').select('*').eq('id', id).maybeSingle()))
    },
    async getPartyBySlug(slug) {
      const row = must(await sb.rpc('public_party', { p_slug: slug }))
      return row ? toParty(row) : null
    },
    async isSlugAvailable(slug, ignoreId) {
      return must(await sb.rpc('party_slug_available', { p_slug: slug, p_ignore: ignoreId || null }))
    },
    async saveParty(input) {
      const bid = await requireBuffet()
      // eslint-disable-next-line no-unused-vars
      const { id, slug, clientToken, buffetId: _b, buffet, createdAt, updatedAt, ...data } = input
      if (data.coverImage?.startsWith('data:')) data.coverImage = await uploadDataUrl(data.coverImage, 'invites')
      const row = must(
        await sb
          .from('parties')
          .upsert({ id: id || uid(), buffet_id: bid, slug, client_token: clientToken || uid(), data, updated_at: new Date().toISOString() })
          .select()
          .single()
      )
      emit('party')
      return toParty(row)
    },
    async deleteParty(id) {
      const party = await api.getParty(id)
      must(await sb.from('parties').delete().eq('id', id))
      if (party?.coverImage?.includes('/invites/')) await removeImages([party.coverImage])
      emit('party')
    },

    // ── Confirmações ──
    async listRsvps(partyId) {
      const rows = must(await sb.from('rsvps').select('*').eq('party_id', partyId).order('created_at', { ascending: false }))
      return rows.map(toRsvp)
    },
    /** Totais de todas as festas do buffet numa única consulta */
    async listRsvpTotals() {
      await requireBuffet()
      const rows = must(await sb.from('rsvps').select('party_id,adults,children'))
      const out = {}
      for (const r of rows) {
        const t = (out[r.party_id] ||= { adults: 0, children: 0, total: 0, responses: 0 })
        t.adults += r.adults
        t.children += r.children
        t.total = t.adults + t.children
        t.responses += 1
      }
      return out
    },
    async addRsvp(partyId, data) {
      const payload = {
        p_party: partyId,
        p_name: String(data.name || '').trim(),
        p_adults: Math.max(0, Number(data.adults) || 0),
        p_children: Math.max(0, Number(data.children) || 0),
        p_guests: Array.isArray(data.guests) ? data.guests : [],
        p_message: String(data.message || '').trim() || null,
      }
      const id = must(await sb.rpc('add_rsvp', payload))
      emit('rsvp', partyId)
      return toRsvp({
        id,
        party_id: partyId,
        name: payload.p_name,
        adults: payload.p_adults,
        children: payload.p_children,
        guests: payload.p_guests,
        message: payload.p_message,
        created_at: new Date().toISOString(),
      })
    },
    async deleteRsvp(partyId, rsvpId) {
      must(await sb.from('rsvps').delete().eq('id', rsvpId))
      emit('rsvp', partyId)
    },
    async getClientList(token) {
      if (!/^[0-9a-f-]{36}$/i.test(String(token))) return null
      const res = must(await sb.rpc('client_list', { p_token: token }))
      if (!res) return null
      return { party: toParty(res.party), buffet: res.buffet, rsvps: (res.rsvps || []).map(toRsvp) }
    },

    /**
     * Avisos de mudança. Tipos: rsvp · party · theme · settings · account · poll
     * "poll" chega a cada 8 s (tela visível), ao voltar para o app e ao
     * reconectar — plano B caso o tempo real caia (internet do celular oscilando).
     */
    subscribe(callback) {
      const onLocal = (e) => callback(e.detail)
      bus.addEventListener('change', onLocal)
      const timer = setInterval(() => {
        if (document.visibilityState === 'visible') callback({ type: 'poll' })
      }, POLL_MS)
      const onVisible = () => document.visibilityState === 'visible' && callback({ type: 'poll' })
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('online', onVisible)
      return () => {
        bus.removeEventListener('change', onLocal)
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('online', onVisible)
        clearInterval(timer)
      }
    },
  }
  return api
}

export function translateError(error) {
  const msg = error?.message || String(error)
  if (/Invalid login credentials/i.test(msg)) return 'Nome do buffet ou senha incorretos.'
  if (/User already registered/i.test(msg)) return 'Esse buffet já tem senha cadastrada. Use a aba "Entrar".'
  if (/Password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/Email not confirmed/i.test(msg)) return 'Desligue "Confirm email" no Supabase (veja o tutorial).'
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return 'O login com Google ainda não foi ligado no Supabase (veja o tutorial).'
  if (/Signups not allowed|signups? (are )?disabled/i.test(msg)) return 'Cadastros desligados no Supabase. Ligue "Allow new users to sign up".'
  if (/row-level security|permission denied/i.test(msg)) return 'Sem permissão. Seu acesso pode estar aguardando liberação.'
  if (/duplicate key|already exists/i.test(msg)) return 'Já existe um item com esse link. Escolha outro.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sem conexão com a internet. Tente de novo.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
  return msg
}
