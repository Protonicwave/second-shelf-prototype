# Second Shelf

A markdown timing engine for grocery fresh waste. It decides when to cut the
price of a perishable line, and by how much, then shows the result against the
fixed reduction schedule a store runs today.

**The result.** Across a thirty day simulated run of twenty four fresh lines,
the engine recovers £6,295 more than the current store policy, a 39 per cent
improvement, and keeps 1,066 kg of food out of the bin.

Live demo: https://protonicwave.github.io/second-shelf-prototype/

## What this is

Supermarkets throw away fresh food that was always going to sell, and reduce
fresh food that was never going to. The reduction decision is usually made by
habit: twenty five per cent at three o'clock, fifty per cent at six, applied to
every line on the shelf whatever its stock, its shelf life or how fast it is
moving.

This prototype replaces that habit with a small search. For each line it
evaluates every markdown plan available to it, simulates the trading day under
each one, and keeps the plan that returns the most value after waste and staff
time are paid for. It then explains that choice in a sentence a colleague on the
shop floor can act on.

## How the engine decides

1. **Model the day.** The store trades fifteen hours, 07:00 to 22:00. A fixed
   footfall curve with a lunch peak and a larger early evening peak scales the
   baseline sales velocity of every line. A line stops selling once its saleable
   life runs out, and cannot sell more than the stock on hand.

2. **Search the plans.** A markdown plan is up to two stages, each an hour and a
   reduction. The second stage must be later and deeper than the first. The
   engine enumerates the candidate set, including the empty plan and every
   single stage plan, and simulates the day under each.

3. **Score on net value.** Revenue, less binned units valued at unit cost plus
   disposal cost, less each markdown event valued at staff cost. The deepest cut
   is rarely the winner: a large early reduction gives away margin on units that
   would have sold at full price, and every extra event costs a colleague's
   time. The engine returns the empty plan when nothing beats it.

Three policies are compared on the same simulated days: no markdown at all, the
current store policy, and the engine.

## What is real and what is simulated

Real:

- The decision logic. The engine, the search and the scoring are complete and
  the same compiled code runs in the browser and in the service.
- The service. Fastify over SQLite, with a persisted decision log and colleague
  overrides recorded against each recommendation.
- The arithmetic. All money is integer pence end to end. No floating point
  currency anywhere.

Simulated:

- Sales. There is no till data. Demand comes from a seeded generator, and the
  price sensitivity, staff cost and disposal cost are assumptions you can move
  with the sliders on the page.
- The catalogue. Twenty four representative fresh lines with plausible prices,
  costs, weights, stock and shelf life. Not one store's real range.
- The environmental figures. Waste avoided is converted at 2.5 kg carbon dioxide
  equivalent and 2.1 meals to the kilogram, sources named in the code.

Everything is deterministic. Seed 20260825, mulberry32, same inputs always give
the same outputs, so two people can compare numbers.

## Architecture

An npm workspaces monorepo, four packages, strict dependency order.

| Package               | Depends on     | What it holds                                           |
| --------------------- | -------------- | ------------------------------------------------------- |
| `@secondshelf/engine` | nothing        | Simulation, plan search, scoring, explanation           |
| `@secondshelf/domain` | engine         | Catalogue, seeded scenarios, policy comparison, metrics |
| `@secondshelf/api`    | engine, domain | Fastify service, SQLite decision log                    |
| `@secondshelf/web`    | engine, domain | React front end, static build                           |

The engine has zero runtime dependencies and is isomorphic by design, which is
why the published demo needs no server: the browser runs the same search the
service would. The simulation runs in a Web Worker, so dragging a slider never
blocks the main thread.

The API is not deployed. Run it locally if you want to see the decision log.

## Running it locally

Requires Node 22 or later.

```sh
npm install
npm run verify
```

`npm run verify` runs the type checker, the linter, the tests and the build, in
that order, and stops at the first failure.

To work on the front end:

```sh
npm run dev --workspace @secondshelf/web
```

## Running the service

```sh
npm run build
npm run start --workspace @secondshelf/api
```

It listens on port 3000 unless `PORT` says otherwise, writes to `decisions.db`
unless `DATABASE_FILE` says otherwise, and allows `http://localhost:5173` as an
origin unless `CORS_ORIGIN` says otherwise.

| Route                        | What it does                                                  |
| ---------------------------- | ------------------------------------------------------------- |
| `GET /health`                | Liveness and version                                          |
| `POST /run`                  | Runs a full scenario and returns metrics and the daily series |
| `POST /recommendations`      | Recommendations for a trading hour, sorted by value at risk   |
| `POST /overrides`            | Records what a colleague actually applied                     |
| `GET /overrides/:decisionId` | The overrides recorded against one decision                   |

Assumptions outside their permitted range are rejected, not clamped.

## Testing

```sh
npm test
```

Vitest across all packages. The engine and domain packages hold coverage above
eighty per cent. A golden master fixture pins the full default run, so any
change to the decision logic that moves a published number fails the build
rather than passing quietly.

## Licence

MIT. See [LICENSE](LICENSE).
