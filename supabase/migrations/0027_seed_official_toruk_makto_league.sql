BEGIN;

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
ADD COLUMN IF NOT EXISTS franchise_type TEXT CHECK (franchise_type IN ('official', 'additional'));

CREATE TABLE IF NOT EXISTS public.official_team_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  combined_gross INTEGER NOT NULL CHECK (combined_gross > 0),
  combined_net INTEGER NOT NULL CHECK (combined_net > 0),
  accumulated_score INTEGER NOT NULL CHECK (accumulated_score > 0),
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.notable_round_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  gross_score INTEGER NOT NULL CHECK (gross_score > 0),
  handicap_index NUMERIC(5, 2) CHECK (handicap_index >= 0),
  net_score INTEGER CHECK (net_score > 0),
  note TEXT,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.league_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('media', 'sponsor')),
  source_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.official_team_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notable_round_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read official team standings" ON public.official_team_standings;
CREATE POLICY "Public read official team standings" ON public.official_team_standings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage official team standings" ON public.official_team_standings;
CREATE POLICY "Managers manage official team standings" ON public.official_team_standings
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'));

DROP POLICY IF EXISTS "Public read notable round performances" ON public.notable_round_performances;
CREATE POLICY "Public read notable round performances" ON public.notable_round_performances
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage notable round performances" ON public.notable_round_performances;
CREATE POLICY "Managers manage notable round performances" ON public.notable_round_performances
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'));

DROP POLICY IF EXISTS "Public read league partners" ON public.league_partners;
CREATE POLICY "Public read league partners" ON public.league_partners
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage league partners" ON public.league_partners;
CREATE POLICY "Managers manage league partners" ON public.league_partners
  FOR ALL TO authenticated
  USING ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('super_admin', 'league_manager'));

GRANT SELECT ON public.official_team_standings TO anon, authenticated;
GRANT SELECT ON public.notable_round_performances TO anon, authenticated;
GRANT SELECT ON public.league_partners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.official_team_standings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notable_round_performances TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.league_partners TO authenticated;

INSERT INTO public.courses (id, name, location, description, holes_count)
VALUES
  ('a1b2c3d4-1111-4000-8000-000000000005', 'Airmen Golf Course & Recreational Park', 'Karachi, Sindh', 'Official Toruk Makto league venue in Karachi.', 18),
  ('a1b2c3d4-1111-4000-8000-000000000009', 'DAC Golf Club', 'Karachi, Sindh', 'Defence Authority Country & Golf Club, official Toruk Makto league venue.', 18)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seasons (id, name, start_date, end_date, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', '2021 Inaugural Season', '2021-01-01', '2021-12-31', 'completed'),
  ('22222222-2222-4222-8222-222222222222', '2026 Toruk Makto League', NULL, NULL, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.divisions (id, season_id, name)
VALUES
  ('11111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'Premier Division'),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Premier Division')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.players (id, player_code, full_name, handicap_index, status)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'TMGL-CAP-001', 'Col Masood', NULL, 'active'),
  ('10000000-0000-4000-8000-000000000002', 'TMGL-CAP-002', 'Arsalan Shikoh', NULL, 'active'),
  ('10000000-0000-4000-8000-000000000003', 'TMGL-CAP-003', 'Irfan Ali', NULL, 'active'),
  ('10000000-0000-4000-8000-000000000004', 'TMGL-CAP-004', 'Ather Abbas', NULL, 'active'),
  ('10000000-0000-4000-8000-000000000005', 'TMGL-CAP-005', 'Sir Asad I Khan', NULL, 'active'),
  ('10000000-0000-4000-8000-000000000006', 'TMGL-CAP-006', 'Brig Tabassum Pervez (R)', NULL, 'active'),
  ('10000000-0000-4000-8000-000000000007', 'TMGL-FND-001', 'Abrar Asif', NULL, 'active'),
  ('20000000-0000-4000-8000-000000000001', 'TMGL-2021-001', 'Hamza Ghani', 3, 'active'),
  ('20000000-0000-4000-8000-000000000002', 'TMGL-2021-002', 'Lt Cdr Naeem Mirza', 16, 'active'),
  ('20000000-0000-4000-8000-000000000003', 'TMGL-2021-003', 'Yashal Shah', NULL, 'active'),
  ('20000000-0000-4000-8000-000000000004', 'TMGL-2021-004', 'Gp Capt Aftab A Khan', NULL, 'active'),
  ('20000000-0000-4000-8000-000000000005', 'TMGL-2021-005', 'Hassan Hashmi', NULL, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teams (id, season_id, division_id, name, captain_player_id, sponsor_name, franchise_type)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112', 'Markhor Warriors', '10000000-0000-4000-8000-000000000001', 'Markhors Logistics', 'official'),
  ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112', 'Karachi Lions', '10000000-0000-4000-8000-000000000002', 'Dawn News', 'official'),
  ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112', 'Nocturnal Bats', '10000000-0000-4000-8000-000000000003', 'Braun', 'official'),
  ('a1000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112', 'Grey Wolf', '10000000-0000-4000-8000-000000000004', 'tsm&co.', 'official'),
  ('a1000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111112', 'Viper Combat GP', '10000000-0000-4000-8000-000000000006', 'Marine Group', 'official'),
  ('b1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Markhors', '10000000-0000-4000-8000-000000000001', 'Markhors Logistics', 'official'),
  ('b1000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Karachi Lions', '10000000-0000-4000-8000-000000000002', 'Dawn News', 'official'),
  ('b1000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Nocturnal Bats', '10000000-0000-4000-8000-000000000003', 'Braun', 'official'),
  ('b1000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Grey Wolf', '10000000-0000-4000-8000-000000000004', 'tsm&co.', 'official'),
  ('b1000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Snow Leopards', '10000000-0000-4000-8000-000000000005', 'United Marine Agencies (UMA)', 'official'),
  ('b1000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Viper Combat GP', '10000000-0000-4000-8000-000000000006', 'Marine Group', 'official'),
  ('b1000000-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Black Tiger', NULL, NULL, 'additional'),
  ('b1000000-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Sky Hawk', NULL, NULL, 'additional'),
  ('b1000000-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Desert Fox', NULL, NULL, 'additional')
ON CONFLICT (season_id, name) DO UPDATE SET
  division_id = EXCLUDED.division_id,
  captain_player_id = EXCLUDED.captain_player_id,
  sponsor_name = EXCLUDED.sponsor_name,
  franchise_type = EXCLUDED.franchise_type,
  updated_at = now();

INSERT INTO public.team_members (team_id, player_id)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('a1000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002'),
  ('a1000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004'),
  ('a1000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005'),
  ('a1000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000006'),
  ('a1000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004'),
  ('b1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003'),
  ('b1000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004'),
  ('b1000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005'),
  ('b1000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006')
ON CONFLICT (team_id, player_id) DO NOTHING;

INSERT INTO public.tournaments (id, season_id, course_id, name, description, event_date, start_date, end_date, status)
VALUES
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'a1b2c3d4-1111-4000-8000-000000000009', 'Main Tournament - DAC&GC', 'Official Toruk Makto tournament held at DAC Golf Club, Karachi on 23 October 2021.', '2021-10-23', '2021-10-23', '2021-10-23', 'completed'),
  ('55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222', 'a1b2c3d4-1111-4000-8000-000000000005', 'Q1 2026 - Qualifiers Round', 'Open registration. Venue: Airmen Golf Club, Karachi.', NULL, NULL, NULL, 'open'),
  ('66666666-6666-4666-8666-666666666666', '22222222-2222-4222-8222-222222222222', 'a1b2c3d4-1111-4000-8000-000000000009', 'Q2 2026 - Semi-Finals', 'Top four qualifiers. Venue: DAC Golf Club, Karachi.', NULL, NULL, NULL, 'draft'),
  ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', NULL, 'Q3 2026 - Grand Finale', 'Top two teams. Venue: premium venue to be announced.', NULL, NULL, NULL, 'draft')
ON CONFLICT (id) DO UPDATE SET
  season_id = EXCLUDED.season_id,
  course_id = EXCLUDED.course_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  event_date = EXCLUDED.event_date,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO public.rounds (id, tournament_id, round_number, name, date, status)
VALUES ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 1, 'Main Tournament - Round 1', '2021-10-23', 'completed')
ON CONFLICT (tournament_id, round_number) DO UPDATE SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO public.official_team_standings (id, tournament_id, team_id, position, combined_gross, combined_net, accumulated_score, source_url)
VALUES
  ('d1000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'a1000000-0000-4000-8000-000000000001', 1, 291, 273, 564, 'https://torukmaktoleague.com/standings.html'),
  ('d1000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'a1000000-0000-4000-8000-000000000005', 2, 322, 281, 603, 'https://torukmaktoleague.com/standings.html'),
  ('d1000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'a1000000-0000-4000-8000-000000000003', 2, 330, 273, 603, 'https://torukmaktoleague.com/standings.html'),
  ('d1000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 'a1000000-0000-4000-8000-000000000004', 4, 330, 285, 615, 'https://torukmaktoleague.com/standings.html')
ON CONFLICT (tournament_id, team_id) DO UPDATE SET
  position = EXCLUDED.position,
  combined_gross = EXCLUDED.combined_gross,
  combined_net = EXCLUDED.combined_net,
  accumulated_score = EXCLUDED.accumulated_score,
  source_url = EXCLUDED.source_url,
  updated_at = now();

INSERT INTO public.notable_round_performances (id, tournament_id, player_id, team_id, gross_score, handicap_index, net_score, note, source_url)
VALUES
  ('e1000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', '20000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 68, 3, 65, 'Low gross score of the tournament.', 'https://torukmaktoleague.com/standings.html'),
  ('e1000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', '20000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 80, 16, 64, 'Low net round of the tournament.', 'https://torukmaktoleague.com/standings.html'),
  ('e1000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', '20000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 72, NULL, NULL, 'Gross score of 72.', 'https://torukmaktoleague.com/standings.html'),
  ('e1000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', '20000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000005', 80, NULL, NULL, 'Gross score of 80.', 'https://torukmaktoleague.com/standings.html'),
  ('e1000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-333333333333', '20000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000004', 83, NULL, NULL, 'Leading gross score for Grey Wolf.', 'https://torukmaktoleague.com/standings.html')
ON CONFLICT (tournament_id, player_id) DO UPDATE SET
  team_id = EXCLUDED.team_id,
  gross_score = EXCLUDED.gross_score,
  handicap_index = EXCLUDED.handicap_index,
  net_score = EXCLUDED.net_score,
  note = EXCLUDED.note,
  source_url = EXCLUDED.source_url;

INSERT INTO public.league_partners (id, name, category, source_url, sort_order)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Dawn News', 'media', 'https://torukmaktoleague.com/partners.html', 1),
  ('c1000000-0000-4000-8000-000000000002', 'Braun', 'sponsor', 'https://torukmaktoleague.com/partners.html', 2),
  ('c1000000-0000-4000-8000-000000000003', 'Skyflame', 'sponsor', 'https://torukmaktoleague.com/partners.html', 3),
  ('c1000000-0000-4000-8000-000000000004', 'Jubilee Life Insurance', 'sponsor', 'https://torukmaktoleague.com/partners.html', 4),
  ('c1000000-0000-4000-8000-000000000005', 'United Marine Agencies', 'sponsor', 'https://torukmaktoleague.com/partners.html', 5),
  ('c1000000-0000-4000-8000-000000000006', 'Marine Group', 'sponsor', 'https://torukmaktoleague.com/partners.html', 6),
  ('c1000000-0000-4000-8000-000000000007', 'tsm&co.', 'sponsor', 'https://torukmaktoleague.com/partners.html', 7),
  ('c1000000-0000-4000-8000-000000000008', 'Bank Alfalah', 'sponsor', 'https://torukmaktoleague.com/partners.html', 8),
  ('c1000000-0000-4000-8000-000000000009', 'Markhors Logistics', 'sponsor', 'https://torukmaktoleague.com/partners.html', 9)
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  source_url = EXCLUDED.source_url,
  sort_order = EXCLUDED.sort_order;

NOTIFY pgrst, 'reload schema';

COMMIT;
