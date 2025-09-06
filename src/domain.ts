/**
 * This file defines types for the application based on the FPL API. 
 * For more information on the data at each endpoint, see 
 * https://medium.com/@frenzelts/fantasy-premier-league-api-endpoints-a-detailed-guide-acbd5598eb19
 */

import type { HttpClient } from "@effect/platform/HttpClient";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Context, Effect, Schema } from "effect";
import type { ParseError } from "effect/Cron";

// Defining some helper schema for the fixture schema
const StatIdentifier = Schema.Literal(
    "goals_scored",
    "assists",
    "own_goals",
    "penalties_saved",
    "yellow_cards",
    "penalties_missed",
    "red_cards",
    "saves",
    "bonus",
    "bps",
    "defensive_contribution"
)

const StatEntry = Schema.Struct({
    value: Schema.Number,
    element: Schema.Number
})
export const FixtureStat = Schema.Struct({
    identifier: Schema.NullOr(StatIdentifier), // for robust stat identifier
    a: Schema.Array(StatEntry),
    h: Schema.Array(StatEntry)
})

const FixtureStruct = Schema.Struct({
    // identity/ schedule
    code: Schema.Number,
    event: Schema.NullOr(Schema.Number), // TBC fixtures may have null Gameweek ID
    id: Schema.Number,
    kickoff_time: Schema.NullOr(Schema.DateTimeUtc),// can be null for postponed

    // state
    minutes: Schema.Boolean,
    provisional_start_time: Schema.Boolean,
    started: Schema.Boolean,
    finished: Schema.Boolean,
    finished_provisional: Schema.Boolean,

    // teams & Scores
    team_a: Schema.Number,
    team_h: Schema.Number,
    team_a_score: Schema.Number,
    team_h_score: Schema.Number,
    team_a_difficulty: Schema.Number,
    team_h_difficulty: Schema.Number,

    // stats 
    stats: Schema.Array(FixtureStat),
    pulse_id: Schema.Number
})

export type Fixture = Schema.Schema.Type<typeof FixtureStruct>

export class FixtureSchema extends Schema.Class<FixtureSchema>("FixtureSchema")(FixtureStruct) { }

/**
 * BOOTSTRAP CLIENT STRUCTURES
 */

const Team = Schema.Struct({
    // identity
    code: Schema.Number,
    id: Schema.Number,
    name: Schema.String,
    short_name: Schema.String,
    pulse_id: Schema.Number,

    // stats
    played: Schema.Number,
    points: Schema.Number,
    position: Schema.Number,
    win: Schema.Number,
    draw: Schema.Number,
    loss: Schema.Number,

    // strength 
    strength: Schema.Number,
    strength_overall_home: Schema.Number,
    strength_overall_away: Schema.Number,
    strength_attack_home: Schema.Number,
    strength_attack_away: Schema.Number,
    strength_defence_home: Schema.Number,
    strength_defence_away: Schema.Number
}
)

export class TeamSchema extends Schema.Class<TeamSchema>("Team")(Team) { }

const Element = Schema.Struct({
    // Identifiers
    id: Schema.Number,
    code: Schema.Number,
    element_type: Schema.Number,
    team: Schema.Number,

    // Names
    first_name: Schema.String,
    second_name: Schema.String,
    web_name: Schema.String,

    // Status & availability
    status: Schema.String,
    chance_of_playing_next_round: Schema.NullOr(Schema.Number),
    chance_of_playing_this_round: Schema.NullOr(Schema.Number),
    in_dreamteam: Schema.Boolean,
    news: Schema.String,

    // Cost & value
    now_cost: Schema.Number,
    value_form: Schema.String,
    value_season: Schema.String,

    // Points & form
    total_points: Schema.Number,
    event_points: Schema.Number,
    form: Schema.String,                 // comes as string
    points_per_game: Schema.String,      // comes as string

    // Core performance stats
    minutes: Schema.Number,
    goals_scored: Schema.Number,
    assists: Schema.Number,
    clean_sheets: Schema.Number,
    goals_conceded: Schema.Number,
    yellow_cards: Schema.Number,
    red_cards: Schema.Number,
    bonus: Schema.Number,
    bps: Schema.Number,

    // Expected stats
    expected_goals: Schema.String,
    expected_assists: Schema.String,
    expected_goal_involvements: Schema.String,
    expected_goals_conceded: Schema.String,

    // Per-90 metrics
    expected_goals_per_90: Schema.Number,
    expected_assists_per_90: Schema.Number,
    expected_goal_involvements_per_90: Schema.Number,
    expected_goals_conceded_per_90: Schema.Number,

    // Popularity
    selected_by_percent: Schema.String,
    transfers_in: Schema.Number,
    transfers_out: Schema.Number
})

export class ElementSchema extends Schema.Class<ElementSchema>("Element Schema")(Element) { }

export class BootstrapDataSchema extends Schema.Class<BootstrapDataSchema>("BootstrapDataSchema")(
    Schema.Struct({
        teams: Schema.Array(TeamSchema),
        total_players: Schema.NullOr(Schema.Number),
        elements: Schema.Array(ElementSchema)
    })) {

}
export interface BootstrapData {
    teams: TeamSchema[],
    total_players: number,
    elements: ElementSchema[]
}

// Concerned with https://fantasy.premierleague.com/api/bootstrap-static/
export class BootstrapClient extends Context.Tag("BootstrapClient")<
    BootstrapClient, {
        getBootstrap(opts: { forceRefresh: boolean }): Effect.Effect<BootstrapDataSchema, ParseError | HttpClientError>,
    }>() {
}

// Define FixtureClient service for https://fantasy.premierleague.com/api/fixtures
export class FixtureClient extends Context.Tag("FixtureClient")<
    FixtureClient, {
        getFixtures(params: { team?: string | undefined, limit?: number, refresh: boolean }): Effect.Effect<FixtureSchema[], Error, BootstrapClient | HttpClient>,
    }>() {
}

