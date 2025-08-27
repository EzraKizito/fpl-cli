import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";

const hello = Command.make('hello', {}, () => Console.log("Hello, World"))

const cli = Command.run(hello, {
    name: "FPL CLI",
    version: "v0.0.1"
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)