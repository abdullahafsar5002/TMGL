import { buildPrompt, buildStats, parseCaddieJson, type HoleInput, type RoundInput } from "../_shared/caddie.ts";
import {
  AppError,
  errorResponse,
  jsonResponse,
  optionalString,
  preflightResponse,
  readJsonBody,
  requireUser,
  uuid,
} from "../_shared/server.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const MAX_ROUNDS = 12;
const TIMEOUT_MS = 20_000;

interface RoundRow {
  id: string;
  completed_at: string | null;
  course_id: string;
}

interface ScoreRow extends HoleInput {
  practice_round_id: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const { user, client } = await requireUser(request);
    const body = await readJsonBody(request);
    const playerId = uuid(body.playerId ?? body.player_id, "player_id_required");

    const { data: roundData, error: roundError } = await client
      .from("practice_rounds")
      .select("id, completed_at, course_id")
      .eq("player_id", playerId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(MAX_ROUNDS);

    if (roundError) {
      throw new AppError("rounds_unavailable", roundError.code === "42501" ? 403 : 500);
    }

    const rounds = (roundData ?? []) as RoundRow[];
    if (rounds.length === 0) {
      return jsonResponse({ content: null, reason: "no_rounds" });
    }

    const ids = rounds.map((round) => round.id);
    const { data: scoreData, error: scoreError } = await client
      .from("practice_scores")
      .select("practice_round_id, hole_number, par, score, putts, fairway_hit, green_in_regulation")
      .in("practice_round_id", ids)
      .order("hole_number", { ascending: true });

    if (scoreError) {
      throw new AppError("scores_unavailable", scoreError.code === "42501" ? 403 : 500);
    }

    const byRound = new Map<string, HoleInput[]>();
    for (const row of (scoreData ?? []) as ScoreRow[]) {
      const list = byRound.get(row.practice_round_id) ?? [];
      list.push({
        hole_number: row.hole_number,
        par: row.par,
        score: row.score,
        putts: row.putts ?? null,
        fairway_hit: row.fairway_hit ?? null,
        green_in_regulation: row.green_in_regulation ?? null,
      });
      byRound.set(row.practice_round_id, list);
    }

    const inputs: RoundInput[] = rounds.map((round) => ({
      id: round.id,
      completed_at: round.completed_at,
      holes: byRound.get(round.id) ?? [],
    }));

    const stats = buildStats(inputs);
    if (stats.rounds.length === 0) {
      return jsonResponse({ content: null, reason: "no_scores" });
    }

    const apiKey = optionalString(Deno.env.get("OPENAI_API_KEY"));
    if (!apiKey) {
      return jsonResponse({ content: null, reason: "not_configured" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const completion = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          max_tokens: 700,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You output strict JSON only." },
            { role: "user", content: buildPrompt(stats) },
          ],
        }),
        signal: controller.signal,
      });

      if (!completion.ok) {
        return jsonResponse({ content: null, reason: "provider_error" }, 200);
      }

      const payload = await completion.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const parsed = parseCaddieJson(raw);
      if (!parsed) {
        return jsonResponse({ content: null, reason: "invalid_provider_response" }, 200);
      }
      return jsonResponse({ content: JSON.stringify(parsed) });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return errorResponse(error);
  }
});
