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

/**
 * TO-DO:
 * 0. Define the FplClient Service
 * 1. Create implementation of FplClient that conforms to this shape
 * 2. Define a program that requires the service FPL Client to run
 * 3. Provide the implementation to the program from step 2 via Effect.provideservice
 * 4. Run the runnable Effect
 */

// Define BootstrapClient service


// Define FixtureClient service
export class FixtureClient extends Context.Tag("FixtureClient")<
    FixtureClient, {
        getFixtures(params: { team?: string | undefined, limit?: number }): Effect.Effect<Fixture[], Error>,
        // get teams
    }>() {
}

// Define actual implementation
export const FixtureClientLive = {
    getFixtures: ({ team, limit }: { team?: string | undefined; limit?: number }) =>
        Effect.tryPromise({
            try: async () => {
                // Fetch data from both API endpoints
                const bootstrap = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/")
                const bootstrapJSON = await bootstrap.json()

                const res = await fetch("https://fantasy.premierleague.com/api/fixtures/")
                const fixtureData: Fixture[] = await res.json()

                // Create a new map between teams and IDs and add teams from ID
                const teamMAP = new Map<string, number>()

                for (let t of bootstrapJSON.teams) {
                    teamMAP.set(t.name.toLowerCase(), t.id)
                }
                // Check usage
                const teamID = team ? teamMAP.get(team.toLowerCase()) : undefined
                if (team && teamID === undefined) {
                    throw new Error('Team not in this year\'s Premier League')
                }

                // Select all fixtures that have team ID
                const filteredFixtures = teamID ? fixtureData.filter(f => f.team_h === teamID || f.team_a === teamID) : fixtureData

                // Pick the first 
                return filteredFixtures.slice(0, limit ?? filteredFixtures.length)

            },
            catch: (e) => new Error(`FPL Error: ${e instanceof Error ? e.message : String(e)}`)
        })
}
