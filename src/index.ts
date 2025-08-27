import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";

const hello = Command.make('hello', {}, () => Console.log("Welcome to the FPL CLI"))

const command = Command.make('fpl').pipe(Command.withSubcommands([hello])) // Hello sub-command

const runnableCli = Command.run(command, {
    name: "FPL CLI",
    version: "v0.0.1"
})

runnableCli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)