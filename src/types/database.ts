/**
 * Database Types reflecting TMGL schema (migrations 0001-0005)
 */

export type UserRole = 'super_admin' | 'league_manager' | 'player' | 'public';
export type SeasonStatus = 'draft' | 'active' | 'completed' | 'archived';
export type TournamentStatus = 'draft' | 'open' | 'closed' | 'live' | 'completed' | 'cancelled';
export type MatchStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
export type ScorecardStatus = 'draft' | 'in_progress' | 'submitted' | 'verified' | 'rejected' | 'amended';
export type MatchType = 'singles' | 'foursome' | 'fourball' | 'team';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: SeasonStatus;
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: string;
  season_id: string;
  name: string;
  created_at: string;
}

export interface Player {
  id: string;
  profile_id: string | null;
  player_code: string | null;
  full_name: string;
  phone: string | null;
  handicap_index: number | null;
  status: string;
  join_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  season_id: string;
  division_id: string | null;
  name: string;
  logo_url: string | null;
  captain_player_id: string | null;
  vice_captain_player_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  player_id: string;
  joined_at: string;
}

export interface Course {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  holes_count: 9 | 18;
  course_rating: number | null;
  slope_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface CourseHole {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  handicap_index: number | null;
  yardage: number | null;
}

export interface Tournament {
  id: string;
  season_id: string;
  course_id: string | null;
  name: string;
  description: string | null;
  event_date: string | null;
  status: TournamentStatus;
  created_at: string;
  updated_at: string;
}

export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
  name: string;
  date: string | null;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  round_id: string;
  match_type: MatchType;
  team_a_id: string | null;
  team_b_id: string | null;
  player_a_id: string | null;
  player_b_id: string | null;
  winner_team_id: string | null;
  winner_player_id: string | null;
  result: string | null;
  status: MatchStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scorecard {
  id: string;
  match_id: string | null;
  round_id: string;
  player_id: string;
  course_id: string | null;
  status: ScorecardStatus;
  total_strokes: number | null;
  total_score_to_par: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScorecardHole {
  id: string;
  scorecard_id: string;
  hole_number: number;
  par: number;
  strokes: number;
  score_to_par: number;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  position: number;
  player_id: string;
  player_name: string;
  team_id: string | null;
  team_name: string | null;
  total_strokes: number;
  total_score_to_par: number;
  holes_completed: number;
  total_holes: number;
  scorecard_id: string | null;
  scorecard_status: ScorecardStatus | null;
}

export interface TeamStanding {
  position: number;
  team_id: string;
  team_name: string;
  total_points: number;
  total_strokes: number;
  total_score_to_par: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      seasons: {
        Row: Season;
        Insert: Partial<Season> & { name: string };
        Update: Partial<Season>;
      };
      divisions: {
        Row: Division;
        Insert: Partial<Division> & { season_id: string; name: string };
        Update: Partial<Division>;
      };
      players: {
        Row: Player;
        Insert: Partial<Player> & { full_name: string };
        Update: Partial<Player>;
      };
      teams: {
        Row: Team;
        Insert: Partial<Team> & { season_id: string; name: string };
        Update: Partial<Team>;
      };
      team_members: {
        Row: TeamMember;
        Insert: Partial<TeamMember> & { team_id: string; player_id: string };
        Update: Partial<TeamMember>;
      };
      courses: {
        Row: Course;
        Insert: Partial<Course> & { name: string };
        Update: Partial<Course>;
      };
      course_holes: {
        Row: CourseHole;
        Insert: Partial<CourseHole> & { course_id: string; hole_number: number; par: number };
        Update: Partial<CourseHole>;
      };
      tournaments: {
        Row: Tournament;
        Insert: Partial<Tournament> & { season_id: string; name: string };
        Update: Partial<Tournament>;
      };
      rounds: {
        Row: Round;
        Insert: Partial<Round> & { tournament_id: string; round_number: number; name: string };
        Update: Partial<Round>;
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & { round_id: string; match_type: MatchType };
        Update: Partial<Match>;
      };
      scorecards: {
        Row: Scorecard;
        Insert: Partial<Scorecard> & { round_id: string; player_id: string };
        Update: Partial<Scorecard>;
      };
      scorecard_holes: {
        Row: ScorecardHole;
        Insert: Partial<ScorecardHole> & { scorecard_id: string; hole_number: number; par: number; strokes: number };
        Update: Partial<ScorecardHole>;
      };
    };
  };
}
