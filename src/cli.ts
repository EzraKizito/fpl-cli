import { Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect, Layer, Option } from "effect";
import { FixtureClient } from "./domain.js";
import { FixtureAdapter, BootstrapClientLive } from "./adapters.js";

const hello = Command.make('hello', {}, () => Console.log("Welcome to the FPL CLI"))

// Create team and limit arguments
const team = Options.text("team").pipe(
    Options.withAlias('t'),
    Options.optional
)

const limit = Options.integer("limit").pipe(
    Options.withAlias("l"),
    Options.optional)

const refresh = Options.boolean("refresh").pipe(
    Options.withAlias("r"),
    Options.optional
)

const fixtures = Command.make('fixtures',
    { limit, team, refresh },
    ({ team, limit, refresh }) => Effect.gen(function* () {
        const client = yield* FixtureClient
        const teamStr = Option.getOrUndefined(team)
        const refreshFlag = Option.getOrElse(refresh, () => false)
        const lim = Option.getOrElse(limit, () => 5)

        const fixtures = yield* client.getFixtures({ team: teamStr, limit: lim, refresh: refreshFlag })
        yield* Console.log(fixtures)
    }))

const command = Command.make('fpl').pipe(Command.withSubcommands([hello, fixtures])) // Hello sub-command

const runnableCli = Command.run(command, {
    name: "FPL CLI",
    version: "v0.0.1"
})

const FplClientLive = Layer.succeed(FixtureClient, FixtureAdapter)


runnableCli(process.argv).pipe(
    Effect.provide(NodeContext.layer),
    Effect.provide(FplClientLive),
    Effect.provide(BootstrapClientLive),
    NodeRuntime.runMain)