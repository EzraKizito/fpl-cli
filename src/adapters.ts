import { Context, Duration, Effect, Layer, Schedule, Schema } from "effect";

import { BootstrapClient, FixtureClient, FixtureSchema } from "./domain.js";
import { type Fixture, BootstrapDataSchema } from "./domain.js";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "@effect/platform";
import { ParseError } from "effect/Cron";
import type { HttpClientError, ResponseError } from "@effect/platform/HttpClientError";

const bootstrap_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
const fixtures_url = "https://fantasy.premierleague.com/api/fixtures/?future=1" // By default, fixtures are forward-looking

// Live implementation of service
const BootstrapAdapter = Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    // Define the fetch
    const fetchBootstrap = httpClient.get(bootstrap_url).pipe(
        Effect.retry(Schedule.exponential(3)),
        Effect.flatMap(HttpClientResponse.schemaBodyJson(BootstrapDataSchema)),
        Effect.mapError(error => error as HttpClientError | ParseError)
    )

    // Cache for 15 minutes + invalidate
    const [cachedBootstrap, invalidateBootstrap] =
        yield* Effect.cachedInvalidateWithTTL(
            fetchBootstrap,
            Duration.minutes(15)
        )
    // Return service implementation
    return {
        getBootstrap: (opts: { forceRefresh: boolean }) =>
            opts.forceRefresh
                ? Effect.zipRight(invalidateBootstrap, fetchBootstrap)
                : cachedBootstrap
    }
})

// Layer construction
export const BootstrapClientLive = Layer.scoped(BootstrapClient, BootstrapAdapter).pipe(
    Layer.provide(FetchHttpClient.layer)
)

// Implementation of a FixtureClient service
export const FixtureAdapter: Context.Tag.Service<FixtureClient> = {
    getFixtures: ({ team, limit, refresh }: { team?: string | undefined; limit?: number, refresh: boolean }) =>
        Effect.gen(function* () {
            const httpClient = yield* HttpClient.HttpClient

            // Define the fetch
            const res = yield* httpClient.get(fixtures_url).pipe(
                Effect.retry(Schedule.exponential(3)),
                Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Array(FixtureSchema))),
                Effect.mapError(error => error as HttpClientError | ParseError)
            )

            const bootstrapDirectory = yield* BootstrapClient
            const bootstrapData = yield* bootstrapDirectory.getBootstrap({ forceRefresh: refresh })

            // Create a new map between teams and IDs and add teams from ID
            const teamMAP = new Map<string, number>()
            for (let t of bootstrapData.teams) {
                teamMAP.set(t.name.toLowerCase(), t.id)
            }

            // Check usage
            const teamID = team ? teamMAP.get(team.toLowerCase()) : undefined
            if (team && teamID === undefined) {
                throw new Error('Team not in this year\'s Premier League')
            }

            // Select all fixtures that have team ID
            const filteredFixtures = teamID ? res.filter(f => f.team_h === teamID || f.team_a === teamID) : res

            // Pick the first limit fixtures, else return everything
            return filteredFixtures.slice(0, limit ?? filteredFixtures.length)
        })
}

// Layer construction
export const FixtureClientLive = Layer.scoped(FixtureClient, Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const bootstrap = yield* BootstrapClient

    return {
        getFixtures: FixtureAdapter.getFixtures
    }
})).pipe(
    Layer.provide(FetchHttpClient.layer)
)