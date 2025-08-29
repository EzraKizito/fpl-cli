import { HttpClient } from "@effect/platform";
import { Context, Effect, Layer } from "effect";

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

/**
 * TO-DO:
 * 0. Define the types of the Bootstrap Data
 */

// Define BootstrapClient service

// Relevant URL: https://fantasy.premierleague.com/api/bootstrap-static/

// For more information about the API endpoints, see https://medium.com/@frenzelts/fantasy-premier-league-api-endpoints-a-detailed-guide-acbd5598eb19

// Client which stores and caches bootstrap info, since every other client likely depends on it
export class BootstrapClient extends Context.Tag("BoostrapClient")<
    BootstrapClient, {
        getBootstrap(): Effect.Effect<any, Error>,
        // some method to cache it
    }>() {
}

// Define FixtureClient service
export class FixtureClient extends Context.Tag("FixtureClient")<
    FixtureClient, {
        getFixtures(params: { team?: string | undefined, limit?: number }): Effect.Effect<Fixture[], Error, BootstrapClient>,
    }>() {
}

export const BootstrapAdapter: Context.Tag.Service<BootstrapClient> = {
    getBootstrap: () => Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
            try: () => fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
            catch: (e) => new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`)
        })
        if (!res.ok) {
            return yield* Effect.fail(new Error(`Upstream error: ${res.status} ${res.statusText}`))
        }
        const json = yield* Effect.tryPromise({
            try: () => res.json(),
            catch: (e) => new Error(`Decode error: ${e instanceof Error ? e.message : String(e)}`)
        })
        // validate JSON
        return json.teams
    })
}

// Define actual implementation
export const FixtureAdapter = {
    getFixtures: ({ team, limit }: { team?: string | undefined; limit?: number }) =>
        Effect.gen(function* () {
            const res = yield* Effect.tryPromise({
                try: () => fetch("https://fantasy.premierleague.com/api/fixtures/"),
                catch: (e) => new Error(`Error getting fixture data: ${e instanceof Error ? e.message : String(e)}`)
            })
            if (!res.ok) {
                return yield* Effect.fail(new Error(`Upstream error: ${res.status} ${res.statusText}`))
            }
            const json: Fixture[] = yield* Effect.tryPromise({
                try: () => res.json(),
                catch: (e) => new Error(`Decode error: ${e instanceof Error ? e.message : String(e)}`)
            })

            const bootstrapDirectory = yield* BootstrapClient
            const bootstrapData = yield* bootstrapDirectory.getBootstrap()

            // Create a new map between teams and IDs and add teams from ID
            const teamMAP = new Map<string, TeamId>()
            for (let t of bootstrapData.teams) {
                teamMAP.set(t.name.toLowerCase(), t.id)
            }

            // Check usage
            const teamID = team ? teamMAP.get(team.toLowerCase()) : undefined
            if (team && teamID === undefined) {
                throw new Error('Team not in this year\'s Premier League')
            }

            // Select all fixtures that have team ID
            const filteredFixtures = teamID ? json.filter(f => f.team_h === teamID || f.team_a === teamID) : json

            // Pick the first 
            return filteredFixtures.slice(0, limit ?? filteredFixtures.length)
        })
}
