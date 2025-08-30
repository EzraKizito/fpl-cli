/**
 * This file defines types for the application based on the FPL API. For more information on the information at 
 * each endpoint, see 
 * https://medium.com/@frenzelts/fantasy-premier-league-api-endpoints-a-detailed-guide-acbd5598eb19
 * 
 */

import { Context, Effect } from "effect";

export type TeamId = number;
export type PlayerId = number;
export type GameweekId = number | null;      // can be null for postponed
export type ISODateTime = string | null;     // TBC fixtures may be null

// Known identifiers + string fallback (in case the API adds more)
export type StatIdentifier =
    | "goals_scored"
    | "assists"
    | "own_goals"
    | "penalties_saved"
    | "penalties_missed"
    | "yellow_cards"
    | "red_cards"
    | "saves"
    | "bonus"
    | "bps"
    | "defensive_contribution"
    | (string & {}); // allow unknown identifiers without losing type info

export interface StatEntry {
    value: number;      // e.g., goals: 1
    element: PlayerId;  // player ID (joins to 'elements' in bootstrap-static)
}

export interface FixtureStat {
    identifier: StatIdentifier,
    a: StatEntry[],
    h: StatEntry[]
}

export interface Fixture {
    // identity/ schedule
    code: number,
    event: GameweekId,
    id: number,
    kickoff_time: ISODateTime

    // state
    minutes: number,
    provisional_start_time: boolean,
    started: boolean,
    finished: boolean,
    finished_provisional: boolean

    // teams & Scores
    team_a: TeamId,
    team_h: TeamId,
    team_a_score: number | null;
    team_h_score: number | null;
    team_a_difficulty: TeamId,
    team_h_difficulty: TeamId,

    // stats & misc
    stats: FixtureStat[],
    pulse_id: number

}
export interface Team {
    name: string
    id: number
}
export interface BoostrapData {
    teams: Team[]
}

// Concerned with https://fantasy.premierleague.com/api/bootstrap-static/
export class BootstrapClient extends Context.Tag("BoostrapClient")<
    BootstrapClient, {
        getBootstrap(opts?: { forceRefresh?: boolean }): Effect.Effect<any, Error>,
        // some method to cache it
    }>() {
}

// Define FixtureClient service
export class FixtureClient extends Context.Tag("FixtureClient")<
    FixtureClient, {
        getFixtures(params: { team?: string | undefined, limit?: number, refresh: boolean }): Effect.Effect<Fixture[], Error, BootstrapClient>,
    }>() {
}

