// ────────────────────────────────────────────────────────────
// Ponto único de acesso a dados. A interface importa apenas `repo`.
//
// Sem configuração → modo demonstração (localStorage, 1 buffet de exemplo).
// Com supabaseUrl + supabaseKey em public/config.js → Supabase (vários buffets).
//
// Contrato (todos assíncronos):
//   login:     getSession · onAuthChange · onAuthError · signInWithGoogle ·
//              signUpWithPassword · signInWithPassword · signInDemo · signOut
//   conta:     getAccount → { super, member, buffet } · requestAccess · cancelRequest
//   dono:      adminOverview · setMemberStatus · setBuffetStatus · deleteMember
//   imagens:   uploadImage(dataUrl, pasta) → url
//   ajustes:   getSettings · saveSettings          (buffet logado)
//   público:   getPublicBuffet(handle)
//   temas:     listThemes(buffetId?) · getTheme · getThemeBySlug(slug, buffetId?) ·
//              isThemeSlugAvailable · saveTheme · deleteTheme
//   festas:    listParties · getParty · getPartyBySlug · isSlugAvailable · saveParty · deleteParty
//   rsvps:     listRsvps · listRsvpTotals · addRsvp · deleteRsvp · getClientList(token)
//   avisos:    subscribe(cb) → unsubscribe
// ────────────────────────────────────────────────────────────
import { CONFIG, isCloud } from '../lib/config'
import { createLocalAdapter } from './localAdapter'
import { createSupabaseAdapter } from './supabaseAdapter'
import { seedDemoData } from './seed'

export const repo = isCloud()
  ? createSupabaseAdapter({ url: CONFIG.supabaseUrl, anonKey: CONFIG.supabaseKey })
  : createLocalAdapter()

export const isDemo = repo.name === 'local'

/** Resolve quando os dados de demonstração estiverem prontos (no-op no Supabase) */
export const ready = isDemo ? seedDemoData(repo) : Promise.resolve()
