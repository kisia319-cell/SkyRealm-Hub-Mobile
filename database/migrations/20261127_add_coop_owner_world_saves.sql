create table if not exists public.co_op_world_owner_saves (
  room_id uuid primary key references public.co_op_rooms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  world_name text not null check (char_length(world_name) between 1 and 32),
  invite_code text not null check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  version bigint not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.co_op_world_owner_saves enable row level security;
revoke all on public.co_op_world_owner_saves from anon, authenticated, public;
revoke all on public.co_op_world_owner_saves from service_role;

create or replace function public.save_co_op_owner_world(p_user_id uuid,p_room_id uuid,p_expected_version bigint,p_world_name text,p_invite_code text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_room public.co_op_rooms%rowtype; v_existing public.co_op_world_owner_saves%rowtype; v_next_version bigint;
begin
  if p_user_id is null or p_room_id is null or p_expected_version is null or p_expected_version < 0
     or p_world_name is null or char_length(trim(p_world_name)) < 1 or char_length(p_world_name) > 32
     or p_invite_code is null or p_invite_code !~ '^[A-HJ-NP-Z2-9]{8}$'
     or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text) > 1048576 then
    raise exception using message = 'INVALID_OWNER_WORLD_SAVE';
  end if;
  select * into v_room from public.co_op_rooms where id=p_room_id for update;
  if not found or v_room.status='closed' then raise exception using message='OWNER_WORLD_NOT_FOUND'; end if;
  if v_room.owner_id<>p_user_id then raise exception using message='OWNER_ONLY'; end if;
  select * into v_existing from public.co_op_world_owner_saves where room_id=p_room_id for update;
  if not found then
    if p_expected_version<>0 then raise exception using message='OWNER_WORLD_SAVE_VERSION_CONFLICT'; end if;
    insert into public.co_op_world_owner_saves(room_id,owner_id,world_name,invite_code,payload,version)
    values(p_room_id,p_user_id,trim(p_world_name),p_invite_code,p_payload,1);
    v_next_version:=1;
  else
    if v_existing.owner_id<>p_user_id then raise exception using message='OWNER_ONLY'; end if;
    if v_existing.version<>p_expected_version then raise exception using message='OWNER_WORLD_SAVE_VERSION_CONFLICT'; end if;
    v_next_version:=v_existing.version+1;
    update public.co_op_world_owner_saves set world_name=trim(p_world_name),invite_code=p_invite_code,
      payload=p_payload,version=v_next_version,updated_at=now() where room_id=p_room_id;
  end if;
  return jsonb_build_object('room_id',p_room_id,'version',v_next_version,'updated_at',now());
end;$function$;

create or replace function public.get_co_op_owner_world(p_user_id uuid,p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_room public.co_op_rooms%rowtype; v_save public.co_op_world_owner_saves%rowtype;
begin
  if p_user_id is null or p_room_id is null then raise exception using message='INVALID_OWNER_WORLD_SAVE'; end if;
  select * into v_room from public.co_op_rooms where id=p_room_id and status<>'closed';
  if not found then raise exception using message='OWNER_WORLD_NOT_FOUND'; end if;
  if v_room.owner_id<>p_user_id then raise exception using message='OWNER_ONLY'; end if;
  select * into v_save from public.co_op_world_owner_saves where room_id=p_room_id and owner_id=p_user_id;
  if not found then return jsonb_build_object('room_id',p_room_id,'version',0,'payload','{}'::jsonb,
    'world_name','Кооперативный мир','invite_code',null,'difficulty',v_room.world_difficulty,'updated_at',null); end if;
  return jsonb_build_object('room_id',p_room_id,'version',v_save.version,'payload',v_save.payload,
    'world_name',v_save.world_name,'invite_code',v_save.invite_code,'difficulty',v_room.world_difficulty,'updated_at',v_save.updated_at);
end;$function$;

create or replace function public.list_my_co_op_owner_worlds(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
begin
  if p_user_id is null then raise exception using message='INVALID_OWNER_WORLD_SAVE'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('room_id',r.id,'world_name',s.world_name,
    'invite_code',s.invite_code,'difficulty',r.world_difficulty,'status',r.status,'version',s.version,
    'updated_at',s.updated_at) order by s.updated_at desc)
    from public.co_op_world_owner_saves s join public.co_op_rooms r on r.id=s.room_id
    where s.owner_id=p_user_id and r.owner_id=p_user_id and r.status<>'closed'),'[]'::jsonb);
end;$function$;

revoke all on function public.save_co_op_owner_world(uuid,uuid,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.get_co_op_owner_world(uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_my_co_op_owner_worlds(uuid) from public,anon,authenticated;
grant execute on function public.save_co_op_owner_world(uuid,uuid,bigint,text,text,jsonb) to service_role;
grant execute on function public.get_co_op_owner_world(uuid,uuid) to service_role;
grant execute on function public.list_my_co_op_owner_worlds(uuid) to service_role;
