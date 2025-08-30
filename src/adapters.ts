import { Cache, Context, Duration, Effect, Layer } from "effect";

import { BootstrapClient, FixtureClient } from "./domain.js";
import type { BoostrapData, Fixture, TeamId } from "./domain.js";

export const BootstrapClientLive = Layer.scoped(
    BootstrapClient,
    Effect.gen(function* () {
        const fetchBootstrap: Effect.Effect<BoostrapData, Error> = Effect.gen(function* () {
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
            // after parsing json:
            if (!json || !Array.isArray(json.teams)) {
                return yield* Effect.fail(new Error(`Decode error: Bootstrap.teams is not an array`))
            }
            // validate JSON
            return json as BoostrapData
        })

        const [cachedBootstrap, invalidateBootstrap] = yield* Effect.cachedInvalidateWithTTL(
            fetchBootstrap,
            Duration.minutes(15)
        )

        return {
            getBootstrap: (opts?: { forceRefresh: boolean }) =>
                opts?.forceRefresh
                    ? Effect.zipRight(invalidateBootstrap, fetchBootstrap)
                    : cachedBootstrap
        }
    })
)

export const FixtureAdapter: Context.Tag.Service<FixtureClient> = {
    getFixtures: ({ team, limit, refresh }: { team?: string | undefined; limit?: number, refresh?: boolean }) =>
        Effect.gen(function* () {
            const res = yield* Effect.tryPromise({
                try: () => fetch("https://fantasy.premierleague.com/api/fixtures?future=1"),
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
            const bootstrapData = yield* bootstrapDirectory.getBootstrap(refresh ? { forceRefresh: refresh } : {})

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

