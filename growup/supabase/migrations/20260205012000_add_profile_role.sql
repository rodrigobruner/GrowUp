alter table public.profiles
add column if not exists role text not null default 'USER'
check (role in ('USER', 'ADMIN'));

update public.profiles
set role = 'USER'
where role is null;
