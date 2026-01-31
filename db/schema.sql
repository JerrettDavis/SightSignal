create table if not exists sightings (
  id text primary key,
  type_id text not null,
  category_id text not null,
  location_lat double precision not null,
  location_lng double precision not null,
  description text not null,
  details text,
  importance text not null,
  status text not null,
  observed_at timestamptz not null,
  created_at timestamptz not null,
  fields jsonb not null default '{}'::jsonb,
  reporter_id text
);

create table if not exists geofences (
  id text primary key,
  name text not null,
  visibility text not null,
  polygon jsonb not null,
  created_at timestamptz not null,
  owner_id text
);

create table if not exists subscriptions (
  id text primary key,
  email text not null,
  target_kind text not null,
  geofence_id text,
  polygon jsonb,
  category_ids jsonb not null default '[]'::jsonb,
  type_ids jsonb not null default '[]'::jsonb,
  trust_level text not null,
  created_at timestamptz not null
);

create index if not exists idx_sightings_status on sightings (status);
create index if not exists idx_sightings_type_id on sightings (type_id);
create index if not exists idx_sightings_category_id on sightings (category_id);
create index if not exists idx_geofences_visibility on geofences (visibility);
create index if not exists idx_subscriptions_email on subscriptions (email);

-- Users table
create table if not exists users (
  id text primary key,
  email text not null unique,
  username text,
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_username on users(username) where username is not null;
create index if not exists idx_users_role on users(role);
create index if not exists idx_users_status on users(status);
create index if not exists idx_users_created_at on users(created_at desc);

-- User credentials for password authentication
create table if not exists user_credentials (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (id) references users(id) on delete cascade
);

create index if not exists idx_user_credentials_email on user_credentials(email);

-- Passkeys for WebAuthn authentication
create table if not exists passkeys (
  id text primary key,
  user_id text not null,
  credential_public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  backup_eligible boolean not null default false,
  backup_state boolean not null default false,
  name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  foreign key (user_id) references users(id) on delete cascade
);

create index if not exists idx_passkeys_user_id on passkeys(user_id);
create index if not exists idx_passkeys_id on passkeys(id);
