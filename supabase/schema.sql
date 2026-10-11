-- ════════════════════════════════════════════════════════════════
--  FESTIFY v3 — banco multi-buffet (vários buffets, cada um com seus dados)
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  ⚠️ Este script APAGA as tabelas da versão anterior (dados de teste).
--  Pode ser rodado de novo sem problema.
-- ════════════════════════════════════════════════════════════════

-- ── Limpa a versão anterior ─────────────────────────────────────
drop table if exists public.rsvps cascade;
drop table if exists public.parties cascade;
drop table if exists public.themes cascade;
drop table if exists public.settings cascade;
drop table if exists public.admins cascade;
drop table if exists public.members cascade;
drop table if exists public.buffets cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.public_party(text) cascade;
drop function if exists public.client_list(uuid) cascade;

-- ── Tabelas ─────────────────────────────────────────────────────

-- Donos da plataforma (você): aprovam buffets
create table if not exists public.super_admins (
  email text primary key
);

-- Buffets (cada empresa)
create table public.buffets (
  id          uuid primary key default gen_random_uuid(),
  handle      text unique not null check (handle ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name        text not null check (char_length(name) between 2 and 80),
  status      text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  data        jsonb not null default '{}'::jsonb,  -- WhatsApp, logo, banner, endereço...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Quem acessa cada buffet (uma conta = um buffet)
create table public.members (
  user_id     uuid primary key,
  buffet_id   uuid not null references public.buffets(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  method      text not null default 'google' check (method in ('google', 'senha')),
  email       text,
  created_at  timestamptz not null default now()
);
create index members_buffet_idx on public.members (buffet_id);

-- Biblioteca de temas (dezenas por buffet)
create table public.themes (
  id          uuid primary key default gen_random_uuid(),
  buffet_id   uuid not null references public.buffets(id) on delete cascade,
  slug        text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (buffet_id, slug)
);
create index themes_buffet_idx on public.themes (buffet_id);

-- Convites
create table public.parties (
  id            uuid primary key default gen_random_uuid(),
  buffet_id     uuid not null references public.buffets(id) on delete cascade,
  slug          text unique not null,
  client_token  uuid not null unique default gen_random_uuid(),
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index parties_buffet_idx on public.parties (buffet_id);

-- Confirmações (com o nome de cada pessoa)
create table public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references public.parties(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 80),
  adults      int  not null default 0 check (adults between 0 and 30),
  children    int  not null default 0 check (children between 0 and 30),
  guests      jsonb not null default '[]'::jsonb,   -- [{ "name": "...", "kind": "adult" | "child" }]
  message     text check (message is null or char_length(message) <= 280),
  created_at  timestamptz not null default now()
);
create index rsvps_party_idx on public.rsvps (party_id, created_at desc);

-- ── Funções de permissão ────────────────────────────────────────

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.super_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Buffet ATIVO da conta logada (null se pendente/bloqueada)
create or replace function public.my_buffet_id()
returns uuid language sql stable security definer set search_path = public as $$
  select m.buffet_id from public.members m
  join public.buffets b on b.id = m.buffet_id
  where m.user_id = auth.uid() and m.status = 'active' and b.status = 'active';
$$;

create or replace function public.can_manage(p_buffet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_buffet is not null and (p_buffet = public.my_buffet_id() or public.is_super());
$$;

-- Buffet da conta logada mesmo se ainda pendente (para ver a tela "aguardando liberação")
create or replace function public.my_any_buffet_id()
returns uuid language sql stable security definer set search_path = public as $$
  select buffet_id from public.members where user_id = auth.uid();
$$;

create or replace function public.buffet_active(p_buffet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.buffets where id = p_buffet and status = 'active');
$$;

create or replace function public.party_buffet(p_party uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select buffet_id from public.parties where id = p_party;
$$;

-- ── Funções do app ──────────────────────────────────────────────

-- Situação da conta logada: { member, buffet, super }
create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'super', public.is_super(),
    'member', (select to_jsonb(m) from public.members m where m.user_id = auth.uid()),
    'buffet', (select to_jsonb(b) from public.members m join public.buffets b on b.id = m.buffet_id where m.user_id = auth.uid())
  );
$$;

-- Pedir acesso: cria um buffet novo (pendente) ou pede para entrar num buffet existente
create or replace function public.request_access(p_name text, p_handle text, p_method text default 'google')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_buffet uuid;
  v_super boolean := public.is_super();
begin
  if v_uid is null then raise exception 'Faça login primeiro'; end if;
  if exists (select 1 from public.members where user_id = v_uid) then return public.my_account(); end if;
  if p_handle is null or p_handle !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
    raise exception 'Nome do buffet inválido';
  end if;

  select id into v_buffet from public.buffets where handle = p_handle;
  if v_buffet is null then
    insert into public.buffets (handle, name, status, data)
    values (p_handle, trim(p_name), case when v_super then 'active' else 'pending' end,
            jsonb_build_object('tagline', 'Escolha o tema da sua festa e receba o convite online'))
    returning id into v_buffet;
  end if;

  insert into public.members (user_id, buffet_id, status, method, email)
  values (v_uid, v_buffet, case when v_super then 'active' else 'pending' end,
          case when p_method = 'senha' then 'senha' else 'google' end,
          auth.jwt() ->> 'email');
  return public.my_account();
end $$;

-- Cancelar um pedido pendente (para tentar outro nome)
create or replace function public.cancel_request()
returns void language plpgsql security definer set search_path = public as $$
declare v_buffet uuid;
begin
  delete from public.members where user_id = auth.uid() and status = 'pending' returning buffet_id into v_buffet;
  if v_buffet is not null then
    delete from public.buffets b where b.id = v_buffet and b.status = 'pending'
      and not exists (select 1 from public.members m where m.buffet_id = b.id);
  end if;
end $$;

-- Painel do dono da plataforma: todos os buffets e acessos
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super() then raise exception 'Somente o administrador do Festify'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'buffet', to_jsonb(b) - 'data',
      'whatsapp', b.data ->> 'whatsapp',
      'themes', (select count(*) from public.themes t where t.buffet_id = b.id),
      'parties', (select count(*) from public.parties p where p.buffet_id = b.id),
      'members', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from public.members m where m.buffet_id = b.id), '[]'::jsonb)
    ) order by b.created_at desc)
    from public.buffets b), '[]'::jsonb);
end $$;

create or replace function public.set_member_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super() then raise exception 'Somente o administrador do Festify'; end if;
  if p_status not in ('pending', 'active', 'blocked') then raise exception 'Status inválido'; end if;
  update public.members set status = p_status where user_id = p_user;
  -- liberar um acesso também libera o buffet que ainda estava pendente
  if p_status = 'active' then
    update public.buffets set status = 'active', updated_at = now()
    where id = (select buffet_id from public.members where user_id = p_user) and status = 'pending';
  end if;
end $$;

create or replace function public.set_buffet_status(p_buffet uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super() then raise exception 'Somente o administrador do Festify'; end if;
  if p_status not in ('pending', 'active', 'blocked') then raise exception 'Status inválido'; end if;
  update public.buffets set status = p_status, updated_at = now() where id = p_buffet;
end $$;

create or replace function public.delete_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super() then raise exception 'Somente o administrador do Festify'; end if;
  delete from public.members where user_id = p_user;
end $$;

-- Link de convite livre? (os convites são privados, então a checagem é feita aqui)
create or replace function public.party_slug_available(p_slug text, p_ignore uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.parties where slug = p_slug and id is distinct from p_ignore);
$$;

-- Convite público + dados públicos do buffet (sem expor o token da lista)
create or replace function public.public_party(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'data', p.data, 'created_at', p.created_at,
    'buffet', jsonb_build_object('handle', b.handle, 'name', b.name,
                                 'logo', b.data ->> 'logo', 'whatsapp', b.data ->> 'whatsapp'))
  from public.parties p join public.buffets b on b.id = p.buffet_id
  where p.slug = p_slug and b.status = 'active';
$$;

-- Convidado confirma presença (com o nome de cada pessoa)
create or replace function public.add_rsvp(p_party uuid, p_name text, p_adults int, p_children int,
                                          p_guests jsonb default '[]'::jsonb, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.parties p join public.buffets b on b.id = p.buffet_id
                 where p.id = p_party and b.status = 'active') then
    raise exception 'Convite não encontrado';
  end if;
  if coalesce(p_adults, 0) + coalesce(p_children, 0) < 1 then raise exception 'Informe pelo menos 1 pessoa'; end if;
  if jsonb_typeof(coalesce(p_guests, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_guests, '[]'::jsonb)) > 60 then
    raise exception 'Lista de nomes inválida';
  end if;
  insert into public.rsvps (party_id, name, adults, children, guests, message)
  values (p_party, trim(p_name), coalesce(p_adults, 0), coalesce(p_children, 0),
          coalesce(p_guests, '[]'::jsonb), nullif(trim(coalesce(p_message, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

-- Lista privada do cliente (pai/mãe), acessada pelo token secreto
create or replace function public.client_list(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'party', jsonb_build_object('id', p.id, 'slug', p.slug, 'data', p.data, 'created_at', p.created_at),
    'buffet', jsonb_build_object('handle', b.handle, 'name', b.name),
    'rsvps', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc)
                       from public.rsvps r where r.party_id = p.id), '[]'::jsonb))
  from public.parties p join public.buffets b on b.id = p.buffet_id
  where p.client_token = p_token;
$$;

-- Permissões das funções
revoke all on function public.public_party(text), public.client_list(uuid),
  public.add_rsvp(uuid, text, int, int, jsonb, text), public.party_slug_available(text, uuid),
  public.my_account(), public.request_access(text, text, text), public.cancel_request(),
  public.admin_overview(), public.set_member_status(uuid, text), public.set_buffet_status(uuid, text),
  public.delete_member(uuid) from public;
grant execute on function public.public_party(text), public.client_list(uuid),
  public.add_rsvp(uuid, text, int, int, jsonb, text) to anon, authenticated;
grant execute on function public.party_slug_available(text, uuid), public.my_account(),
  public.request_access(text, text, text), public.cancel_request(), public.admin_overview(),
  public.set_member_status(uuid, text), public.set_buffet_status(uuid, text),
  public.delete_member(uuid) to authenticated;
grant execute on function public.is_super(), public.my_buffet_id(), public.can_manage(uuid),
  public.party_buffet(uuid), public.my_any_buffet_id(), public.buffet_active(uuid) to anon, authenticated;

-- ── Row Level Security ──────────────────────────────────────────

alter table public.super_admins enable row level security;
alter table public.buffets      enable row level security;
alter table public.members      enable row level security;
alter table public.themes       enable row level security;
alter table public.parties      enable row level security;
alter table public.rsvps        enable row level security;

-- buffets: público vê os ativos; o próprio buffet edita nome e dados (não o status)
create policy buffets_read   on public.buffets for select
  using (status = 'active' or public.can_manage(id) or id = public.my_any_buffet_id());
create policy buffets_update on public.buffets for update to authenticated
  using (public.can_manage(id)) with check (public.can_manage(id));

-- members: cada um vê o próprio acesso (mudanças só pelas funções)
create policy members_self on public.members for select to authenticated using (user_id = auth.uid() or public.is_super());

-- themes: público vê os temas de buffets ativos; o buffet gerencia os seus
create policy themes_read  on public.themes for select
  using (public.buffet_active(buffet_id) or public.can_manage(buffet_id));
create policy themes_write on public.themes for all to authenticated
  using (public.can_manage(buffet_id)) with check (public.can_manage(buffet_id));

-- parties: só o próprio buffet (o público usa public_party)
create policy parties_own on public.parties for all to authenticated
  using (public.can_manage(buffet_id)) with check (public.can_manage(buffet_id));

-- rsvps: só o buffet dono da festa lê e apaga (convidados usam add_rsvp)
create policy rsvps_own on public.rsvps for all to authenticated
  using (public.can_manage(public.party_buffet(party_id))) with check (public.can_manage(public.party_buffet(party_id)));

revoke all on public.super_admins, public.buffets, public.members, public.themes, public.parties, public.rsvps from anon, authenticated;
grant select on public.buffets, public.themes to anon, authenticated;
grant update (name, data, updated_at) on public.buffets to authenticated;
grant select on public.members to authenticated;
grant select, insert, update, delete on public.themes, public.parties, public.rsvps to authenticated;
revoke insert, update, delete on public.rsvps from anon;

-- ── Fotos (Storage): cada buffet só mexe na própria pasta ───────

insert into storage.buckets (id, name, public)
values ('festify', 'festify', true)
on conflict (id) do update set public = true;

drop policy if exists festify_read   on storage.objects;
drop policy if exists festify_insert on storage.objects;
drop policy if exists festify_update on storage.objects;
drop policy if exists festify_delete on storage.objects;
create policy festify_read   on storage.objects for select using (bucket_id = 'festify');
create policy festify_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'festify' and public.can_manage(nullif((storage.foldername(name))[1], '')::uuid));
create policy festify_update on storage.objects for update to authenticated
  using (bucket_id = 'festify' and public.can_manage(nullif((storage.foldername(name))[1], '')::uuid));
create policy festify_delete on storage.objects for delete to authenticated
  using (bucket_id = 'festify' and public.can_manage(nullif((storage.foldername(name))[1], '')::uuid));

-- ── Tempo real (lista de presença atualiza sozinha) ─────────────

do $$
declare t text;
begin
  foreach t in array array['rsvps', 'parties', 'themes', 'buffets', 'members'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
              when undefined_object then null;
    end;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════
--  ÚLTIMO PASSO (rode separado): coloque o SEU Gmail como dono da plataforma
--
--  insert into public.super_admins (email) values ('seu-email@gmail.com')
--  on conflict do nothing;
-- ════════════════════════════════════════════════════════════════
