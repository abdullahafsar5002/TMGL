/**
 * Pure validation helpers for Phase 2 and Phase 3 entities.
 *
 * These functions are side-effect-free and testable.
 * They return a ValidationResult with an errors array.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { isValid: true, errors: [] };
}

function fail(errors: string[]): ValidationResult {
  return { isValid: false, errors };
}

// -------------------------------------------------------------------
// Season validation
// -------------------------------------------------------------------

export interface SeasonInput {
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export function validateSeason(input: SeasonInput): ValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!name) {
    errors.push('Season name is required.');
  } else if (name.length < 2) {
    errors.push('Season name must be at least 2 characters.');
  } else if (name.length > 100) {
    errors.push('Season name must be 100 characters or fewer.');
  }

  if (input.start_date && input.end_date) {
    if (new Date(input.start_date) > new Date(input.end_date)) {
      errors.push('Start date must be before end date.');
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Division validation
// -------------------------------------------------------------------

export interface DivisionInput {
  name: string;
  season_id: string;
}

export function validateDivision(input: DivisionInput): ValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!name) {
    errors.push('Division name is required.');
  } else if (name.length < 2) {
    errors.push('Division name must be at least 2 characters.');
  } else if (name.length > 100) {
    errors.push('Division name must be 100 characters or fewer.');
  }

  if (!input.season_id) {
    errors.push('A season must be selected.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Player validation
// -------------------------------------------------------------------

export interface PlayerInput {
  full_name: string;
  phone: string | null;
  handicap_index: number | null;
  status: string;
}

export function validatePlayer(input: PlayerInput): ValidationResult {
  const errors: string[] = [];
  const name = input.full_name.trim();

  if (!name) {
    errors.push('Player name is required.');
  } else if (name.length < 2) {
    errors.push('Player name must be at least 2 characters.');
  } else if (name.length > 200) {
    errors.push('Player name must be 200 characters or fewer.');
  }

  if (input.phone !== null && input.phone.trim() !== '') {
    const phone = input.phone.trim();
    if (!/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
      errors.push('Phone number format is invalid.');
    }
  }

  if (input.handicap_index !== null) {
    if (input.handicap_index < 0 || input.handicap_index > 54) {
      errors.push('Handicap index must be between 0 and 54.');
    }
  }

  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(input.status)) {
    errors.push('Player status must be active, inactive, or suspended.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Team validation
// -------------------------------------------------------------------

export interface TeamInput {
  name: string;
  season_id: string;
  division_id: string | null;
}

export function validateTeam(input: TeamInput): ValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!name) {
    errors.push('Team name is required.');
  } else if (name.length < 2) {
    errors.push('Team name must be at least 2 characters.');
  } else if (name.length > 100) {
    errors.push('Team name must be 100 characters or fewer.');
  }

  if (!input.season_id) {
    errors.push('A season must be selected.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Team membership validation
// -------------------------------------------------------------------

export interface TeamMemberInput {
  team_id: string;
  player_id: string;
  existingMembers: Array<{ team_id: string; player_id: string }>;
  teamSeasonId: string;
}

export function validateTeamMember(input: TeamMemberInput): ValidationResult {
  const errors: string[] = [];

  if (!input.team_id) {
    errors.push('A team must be selected.');
  }

  if (!input.player_id) {
    errors.push('A player must be selected.');
  }

  // Prevent duplicate membership in the same team
  const alreadyInTeam = input.existingMembers.some(
    (m) => m.team_id === input.team_id && m.player_id === input.player_id
  );
  if (alreadyInTeam) {
    errors.push('This player is already a member of this team.');
  }

  // Check if player is already on another team for the same season
  // (A player can only be on one team per season — this is a business rule assumption)
  const onAnotherTeam = input.existingMembers.some(
    (m) => m.player_id === input.player_id && m.team_id !== input.team_id
  );
  if (onAnotherTeam) {
    errors.push('This player is already assigned to another team in this season.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Tournament validation (Phase 3)
// -------------------------------------------------------------------

export interface TournamentInput {
  name: string;
  season_id: string;
  description: string | null;
  event_date: string | null;
  course_id: string | null;
}

export function validateTournament(input: TournamentInput): ValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!name) {
    errors.push('Tournament name is required.');
  } else if (name.length < 2) {
    errors.push('Tournament name must be at least 2 characters.');
  } else if (name.length > 100) {
    errors.push('Tournament name must be 100 characters or fewer.');
  }

  if (!input.season_id) {
    errors.push('A season must be selected.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Round validation (Phase 3)
// -------------------------------------------------------------------

export interface RoundInput {
  tournament_id: string;
  round_number: number;
  name: string;
  date: string | null;
}

export function validateRound(input: RoundInput): ValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!input.tournament_id) {
    errors.push('A tournament must be selected.');
  }

  if (!Number.isInteger(input.round_number) || input.round_number < 1) {
    errors.push('Round number must be a positive integer.');
  }

  if (!name) {
    errors.push('Round name is required.');
  } else if (name.length > 100) {
    errors.push('Round name must be 100 characters or fewer.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Match validation (Phase 3)
// -------------------------------------------------------------------

export interface MatchInput {
  round_id: string;
  match_type: string;
  team_a_id: string | null;
  team_b_id: string | null;
  player_a_id: string | null;
  player_b_id: string | null;
}

const VALID_MATCH_TYPES = ['singles', 'foursome', 'fourball', 'team'];

export function validateMatch(input: MatchInput): ValidationResult {
  const errors: string[] = [];

  if (!input.round_id) {
    errors.push('A round must be selected.');
  }

  if (!VALID_MATCH_TYPES.includes(input.match_type)) {
    errors.push('Match type must be singles, foursome, fourball, or team.');
  }

  if (input.match_type === 'singles') {
    if (!input.player_a_id) {
      errors.push('Player A is required for a singles match.');
    }
    if (!input.player_b_id) {
      errors.push('Player B is required for a singles match.');
    }
  }

  if (input.match_type === 'team') {
    if (!input.team_a_id) {
      errors.push('Team A is required for a team match.');
    }
    if (!input.team_b_id) {
      errors.push('Team B is required for a team match.');
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Course validation
// -------------------------------------------------------------------

export interface CourseInput {
  name: string;
  location: string | null;
  description: string | null;
  holes_count: 9 | 18;
  course_rating: number | null;
  slope_rating: number | null;
}

export interface CourseHoleInput {
  hole_number: number;
  par: number;
  handicap_index: number | null;
  yardage: number | null;
}

export function validateCourse(input: CourseInput): ValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();

  if (!name) {
    errors.push('Course name is required.');
  } else if (name.length < 2) {
    errors.push('Course name must be at least 2 characters.');
  } else if (name.length > 100) {
    errors.push('Course name must be 100 characters or fewer.');
  }

  if (input.holes_count !== 9 && input.holes_count !== 18) {
    errors.push('Holes count must be 9 or 18.');
  }

  if (input.course_rating !== null) {
    if (input.course_rating < 0 || input.course_rating > 80) {
      errors.push('Course rating must be between 0 and 80.');
    }
  }

  if (input.slope_rating !== null) {
    if (input.slope_rating < 0 || input.slope_rating > 200) {
      errors.push('Slope rating must be between 0 and 200.');
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

export function validateCourseHoles(holes: CourseHoleInput[], totalHoles: number): ValidationResult {
  const errors: string[] = [];

  if (holes.length === 0) {
    errors.push('At least one hole definition is required.');
  }

  const holeNumbers = new Set<number>();
  for (const hole of holes) {
    if (!Number.isInteger(hole.hole_number) || hole.hole_number < 1 || hole.hole_number > totalHoles) {
      errors.push(`Hole number must be between 1 and ${totalHoles}.`);
    }

    if (holeNumbers.has(hole.hole_number)) {
      errors.push(`Duplicate entry for hole ${hole.hole_number}.`);
    }
    holeNumbers.add(hole.hole_number);

    if (!Number.isInteger(hole.par) || hole.par < 3 || hole.par > 6) {
      errors.push(`Par for hole ${hole.hole_number} must be between 3 and 6.`);
    }

    if (hole.handicap_index !== null) {
      if (!Number.isInteger(hole.handicap_index) || hole.handicap_index < 1 || hole.handicap_index > 18) {
        errors.push(`Handicap index for hole ${hole.hole_number} must be between 1 and 18.`);
      }
    }

    if (hole.yardage !== null) {
      if (!Number.isInteger(hole.yardage) || hole.yardage < 0) {
        errors.push(`Yardage for hole ${hole.hole_number} must be a non-negative integer.`);
      }
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Scorecard validation (Phase 3)
// -------------------------------------------------------------------

export interface ScorecardHoleInput {
  hole_number: number;
  par: number;
  strokes: number;
}

export function validateScorecardHoles(
  holes: ScorecardHoleInput[],
  totalHoles: number = 18
): ValidationResult {
  const errors: string[] = [];

  if (holes.length === 0) {
    errors.push('At least one hole score is required.');
  }

  const holeNumbers = new Set<number>();
  for (const hole of holes) {
    if (!Number.isInteger(hole.hole_number) || hole.hole_number < 1 || hole.hole_number > totalHoles) {
      errors.push(`Hole number must be between 1 and ${totalHoles}.`);
    }

    if (holeNumbers.has(hole.hole_number)) {
      errors.push(`Duplicate entry for hole ${hole.hole_number}.`);
    }
    holeNumbers.add(hole.hole_number);

    if (!Number.isInteger(hole.par) || hole.par < 3 || hole.par > 6) {
      errors.push(`Par for hole ${hole.hole_number} must be between 3 and 6.`);
    }

    if (!Number.isInteger(hole.strokes) || hole.strokes < 1 || hole.strokes > 20) {
      errors.push(`Strokes for hole ${hole.hole_number} must be between 1 and 20.`);
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Practice Round Validation
// -------------------------------------------------------------------

export interface PracticeRoundInput {
  course_id: string;
  round_type: 9 | 18;
  tee_box?: string;
  notes?: string;
}

export function validatePracticeRound(input: PracticeRoundInput): ValidationResult {
  const errors: string[] = [];

  if (!input.course_id || input.course_id.trim().length === 0) {
    errors.push('Please select a golf course.');
  }

  if (input.round_type !== 9 && input.round_type !== 18) {
    errors.push('Round type must be 9 or 18 holes.');
  }

  if (input.notes && input.notes.length > 500) {
    errors.push('Notes must be 500 characters or less.');
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}

// -------------------------------------------------------------------
// Practice Score Validation
// -------------------------------------------------------------------

export interface PracticeScoreInput {
  hole_number: number;
  par: number;
  score: number;
  putts?: number | null;
  penalty_strokes?: number | null;
}

export function validatePracticeScores(
  scores: PracticeScoreInput[],
  totalHoles: number
): ValidationResult {
  const errors: string[] = [];

  if (scores.length === 0) {
    errors.push('At least one hole score is required.');
  }

  const holeNumbers = new Set<number>();
  for (const s of scores) {
    if (!Number.isInteger(s.hole_number) || s.hole_number < 1 || s.hole_number > totalHoles) {
      errors.push(`Hole number must be between 1 and ${totalHoles}.`);
    }

    if (holeNumbers.has(s.hole_number)) {
      errors.push(`Duplicate entry for hole ${s.hole_number}.`);
    }
    holeNumbers.add(s.hole_number);

    if (!Number.isInteger(s.par) || s.par < 3 || s.par > 6) {
      errors.push(`Par for hole ${s.hole_number} must be between 3 and 6.`);
    }

    if (!Number.isInteger(s.score) || s.score < 1 || s.score > 20) {
      errors.push(`Score for hole ${s.hole_number} must be between 1 and 20.`);
    }

    if (s.putts !== null && s.putts !== undefined && (!Number.isInteger(s.putts) || s.putts < 0 || s.putts > 20)) {
      errors.push(`Putts for hole ${s.hole_number} must be between 0 and 20.`);
    }

    if (s.penalty_strokes !== null && s.penalty_strokes !== undefined && (!Number.isInteger(s.penalty_strokes) || s.penalty_strokes < 0 || s.penalty_strokes > 10)) {
      errors.push(`Penalty strokes for hole ${s.hole_number} must be between 0 and 10.`);
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok();
}
