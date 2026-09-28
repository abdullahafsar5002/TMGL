/**
 * Database Types reflecting TMGL schema (migrations 0001-0009)
 */

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export type UserRole = 'super_admin' | 'league_manager' | 'player' | 'public';
export type SeasonStatus = 'draft' | 'active' | 'completed' | 'archived';
export type TournamentStatus = 'draft' | 'open' | 'closed' | 'live' | 'completed' | 'cancelled';
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type ScorecardStatus = 'draft' | 'in_progress' | 'submitted' | 'verified' | 'rejected' | 'amended';
export type MatchType = 'singles' | 'foursome' | 'fourball' | 'team';
export type PracticeRoundStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type FranchiseType = 'official' | 'additional';
export type LeaguePartnerCategory = 'media' | 'sponsor';

export interface Profile {
  id: string;
  email?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  membership_tier: 'free' | 'pro';
  membership_expires_at: string | null;
  club_name: string | null;
  club_logo_url: string | null;
  club_primary_color: string | null;
  club_accent_color: string | null;
  certified_club: boolean;
  partner_since: string | null;
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
  auth_user_id: string | null;
  profile_id?: string | null;
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
  sponsor_name: string | null;
  franchise_type: FranchiseType | null;
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
  latitude: number | null;
  longitude: number | null;
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
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  status: TournamentStatus;
  scoring_format: ScoringFormat;
  flight_count: number;
  created_at: string;
  updated_at: string;
}

export type ScoringFormat =
  | 'stroke_play'
  | 'stableford'
  | 'match_play'
  | 'nassau'
  | 'best_ball'
  | 'scramble';

export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
  name: string;
  date: string | null;
  status: MatchStatus;
  scoring_format: ScoringFormat;
  cut_after_hole: number | null;
  cut_line_score: number | null;
  tee_interval_minutes: number;
  first_tee_time: string | null;
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
  differential?: number | null;
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
  handicap_index: number;
  net_strokes: number;
  net_to_par: number;
  holes_completed: number;
  total_holes: number;
  scorecard_id: string | null;
  scorecard_status: ScorecardStatus | null;
  points?: number;
  cut?: string | null;
}

export interface TeamStanding {
  position: number;
  team_id: string;
  team_name: string;
  total_points: number;
  total_strokes: number;
  total_score_to_par: number;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  registered_at: string;
  created_at: string;
}

export interface Shot {
  id: string;
  practice_score_id: string;
  hole_number: number;
  shot_number: number;
  club: string;
  distance_yards: number | null;
  result: 'fairway' | 'green' | 'rough' | 'bunker' | 'water' | 'out_of_bounds' | 'hole_out';
  lie: 'tee' | 'fairway' | 'rough' | 'bunker' | 'green' | 'penalty';
  notes: string | null;
  created_at: string;
}

export interface PracticeRound {
  id: string;
  player_id: string;
  course_id: string;
  round_type: 9 | 18;
  tee_box: string | null;
  status: PracticeRoundStatus;
  started_at: string;
  completed_at: string | null;
  gross_score: number | null;
  net_score: number | null;
  total_to_par: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeScore {
  id: string;
  practice_round_id: string;
  hole_number: number;
  par: number;
  stroke_index: number | null;
  score: number;
  putts: number | null;
  fairway_hit: boolean | null;
  green_in_regulation: boolean | null;
  penalty_strokes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerStatistics {
  id: string;
  player_id: string;
  rounds_played: number;
  average_score: number | null;
  best_score: number | null;
  average_to_par: number | null;
  birdies: number;
  eagles: number;
  pars: number;
  bogeys: number;
  double_bogeys: number;
  average_putts: number | null;
  fairways_hit_percentage: number | null;
  greens_in_regulation_percentage: number | null;
  last_round_at: string | null;
  created_at?: string;
  updated_at: string;
}

export type FriendlyMatchStatus = 'active' | 'rejected' | 'in_progress' | 'completed';
export type FriendlyMatchFormat = 'stroke_play' | 'stableford' | 'match_play' | 'best_ball' | 'scramble';
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type NotificationType = 'match_update' | 'leaderboard_shift' | 'achievement' | 'system' | 'skin_won' | 'score_verified' | 'tournament' | 'registration' | 'payment' | 'membership';

export interface FriendlyMatch {
  id: string;
  creator_id: string;
  course_id: string;
  title: string;
  description: string | null;
  match_format: FriendlyMatchFormat;
  round_type: number;
  status: FriendlyMatchStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FriendlyMatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  invitation_status: InvitationStatus;
  handicap_index: number | null;
  score: number | null;
  to_par: number | null;
  position: number | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  player?: {
    full_name: string;
    handicap_index: number | null;
  } | null;
}

export interface FriendlyMatchScore {
  id: string;
  match_player_id: string;
  hole_number: number;
  par: number;
  score: number;
  stableford_points: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  related_entity?: string | null;
  related_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Gallery {
  id: string;
  title: string;
  description: string | null;
  tournament_id: string | null;
  created_by: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  gallery_id: string;
  image_url: string;
  url?: string | null;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface PlayerDevice {
  id: string;
  profile_id: string;
  fcm_token: string;
  platform: 'web' | 'android' | 'ios';
  device_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeProduct {
  id: string;
  product_key: string;
  kind: 'membership' | 'event_fee';
  tournament_id: string | null;
  amount_minor: number;
  duration_days: number;
  currency: 'PKR';
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeInvoice {
  id: string;
  invoice_number: string;
  payer_profile_id: string;
  product_key: string;
  kind: 'membership' | 'event_fee';
  amount_minor: number;
  currency: 'PKR';
  status: 'open' | 'paid' | 'void' | 'expired';
  due_at: string;
  paid_at: string | null;
  settled_via: 'cash' | 'bank_transfer' | 'cheque' | 'other' | null;
  settled_reference: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficialTeamStanding {
  id: string;
  tournament_id: string;
  team_id: string;
  position: number;
  combined_gross: number;
  combined_net: number;
  accumulated_score: number;
  source_url: string;
  created_at: string;
  updated_at: string;
}

export interface NotableRoundPerformance {
  id: string;
  tournament_id: string;
  player_id: string;
  team_id: string | null;
  gross_score: number;
  handicap_index: number | null;
  net_score: number | null;
  note: string | null;
  source_url: string;
  created_at: string;
}

export interface LeaguePartner {
  id: string;
  name: string;
  category: LeaguePartnerCategory;
  source_url: string;
  sort_order: number;
  created_at: string;
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
      practice_rounds: {
        Row: PracticeRound;
        Insert: Partial<PracticeRound> & { player_id: string; course_id: string; round_type: 9 | 18 };
        Update: Partial<PracticeRound>;
      };
      practice_scores: {
        Row: PracticeScore;
        Insert: Partial<PracticeScore> & { practice_round_id: string; hole_number: number; par: number; score: number };
        Update: Partial<PracticeScore>;
      };
      player_statistics: {
        Row: PlayerStatistics;
        Insert: Partial<PlayerStatistics> & { player_id: string };
        Update: Partial<PlayerStatistics>;
      };
      friendly_matches: {
        Row: FriendlyMatch;
        Insert: Partial<FriendlyMatch> & { creator_id: string; title: string; course_id: string };
        Update: Partial<FriendlyMatch>;
      };
      friendly_match_players: {
        Row: FriendlyMatchPlayer;
        Insert: Partial<FriendlyMatchPlayer> & { match_id: string; player_id: string };
        Update: Partial<FriendlyMatchPlayer>;
      };
      friendly_match_scores: {
        Row: FriendlyMatchScore;
        Insert: Partial<FriendlyMatchScore> & { match_player_id: string; hole_number: number; par: number; score: number };
        Update: Partial<FriendlyMatchScore>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { recipient_id: string; type: NotificationType; title: string; message: string };
        Update: Partial<Notification>;
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & { author_id: string; title: string; content: string };
        Update: Partial<Announcement>;
      };
      galleries: {
        Row: Gallery;
        Insert: Partial<Gallery> & { title: string; created_by: string };
        Update: Partial<Gallery>;
      };
      gallery_images: {
        Row: GalleryImage;
        Insert: Partial<GalleryImage> & { gallery_id: string; image_url: string };
        Update: Partial<GalleryImage>;
      };
      player_devices: {
        Row: PlayerDevice;
        Insert: Partial<PlayerDevice> & { profile_id: string; fcm_token: string };
        Update: Partial<PlayerDevice>;
      };
      fee_products: {
        Row: FeeProduct;
        Insert: Partial<FeeProduct> & { product_key: string; kind: 'membership' | 'event_fee'; amount_minor: number };
        Update: Partial<FeeProduct>;
      };
      fee_invoices: {
        Row: FeeInvoice;
        Insert: Partial<FeeInvoice> & { payer_profile_id: string; product_key: string; amount_minor: number };
        Update: Partial<FeeInvoice>;
      };
    };
  };
}
