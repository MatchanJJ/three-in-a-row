CREATE TABLE IF NOT EXISTS guest_players (
  token_hash text PRIMARY KEY,
  name varchar(24) NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
CREATE TABLE IF NOT EXISTS game_rooms (
  code varchar(8) PRIMARY KEY,
  x_actor text NOT NULL,
  x_name varchar(24) NOT NULL,
  o_actor text,
  o_name varchar(24),
  game jsonb NOT NULL,
  ready jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision integer NOT NULL DEFAULT 0,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  CHECK (o_actor IS NULL OR o_actor <> x_actor)
);
CREATE TABLE IF NOT EXISTS game_results (
  room_code varchar(8) NOT NULL REFERENCES game_rooms(code),
  round integer NOT NULL,
  x_actor text NOT NULL,
  o_actor text NOT NULL,
  winner_actor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, round)
);
CREATE INDEX IF NOT EXISTS results_x_actor ON game_results(x_actor);
CREATE INDEX IF NOT EXISTS results_o_actor ON game_results(o_actor);
CREATE TABLE IF NOT EXISTS request_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL
);
