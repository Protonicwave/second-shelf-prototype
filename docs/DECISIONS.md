# Decisions

Each entry states what was decided, why, and what would change it once real
store data was available.

## 1. All money is integer pence

**Decision.** Prices, costs, revenue and net value are integers in pence
throughout the engine, the domain and the API. Pounds exist only in the
formatting layer.

**Why.** The engine sums thousands of small amounts across twenty four lines and
thirty days. Floating point pounds drift, and a drifting total cannot be pinned
by a golden master or reconciled against a per line breakdown.

**What would change it.** Nothing in this shape. Multi currency or fractional
unit pricing would need a minor unit scale carried alongside the amount, not a
switch to floats.

## 2. Markdown plans are limited to two stages

**Decision.** A plan is at most two reductions, the second later and deeper than
the first.

**Why.** It matches what a colleague can actually execute in a shift, and it
keeps the search space small enough to enumerate exhaustively in the browser.
Three stages roughly cubes the candidate count for a gain the staff cost mostly
eats anyway.

**What would change it.** Electronic shelf labels. If changing a price costs
nothing in staff time, more stages become worth searching and the staff cost
term stops dominating.

## 3. Exhaustive search rather than a learned model

**Decision.** The engine enumerates a fixed candidate set and simulates each
one, rather than fitting a policy or optimising by gradient.

**Why.** The result is explainable line by line, which is the point: a colleague
is told what to reduce, when, and why. It is also fast enough to be exact, so
there is no approximation to defend, and no training data exists yet.

**What would change it.** Real till data. With observed price response per line
the demand curve could be fitted rather than assumed, and the search would then
be over a learned model instead of a declared one. The search itself would stay.

## 4. SQLite rather than Postgres

**Decision.** The decision log is a single better-sqlite3 file with WAL mode on
and synchronous prepared statements.

**Why.** The log is append heavy, single writer and read by one service. There
is no service to run, no connection pool and no migration story to maintain for
a prototype, and the synchronous driver keeps the route handlers plain.

**What would change it.** More than one store writing concurrently, or any need
to query the log from outside the service. Then Postgres, and the schema carries
over almost unchanged.

## 5. One isomorphic engine

**Decision.** The engine is a zero dependency package that runs unmodified in
the browser and in Node.

**Why.** It means the published demo needs no server, and it means the number a
reader sees on the page is produced by the same code the service would run. Two
implementations of the same decision drift apart, and the one on the marketing
page is always the one that drifts.

**What would change it.** Nothing foreseeable. If the search grew past what a
browser should do, the front end would call the service instead, but the engine
would stay one package.

## 6. Hand written SVG rather than a charting library

**Decision.** The policy comparison chart is SVG emitted directly by a React
component.

**Why.** One chart, three series, direct end labels and one annotation. A
charting library would add more to the bundle than the whole rest of the
application, and would still need overriding to match the type and colour of the
page. Writing the axis maths is a short afternoon.

**What would change it.** A second and third chart type with interaction:
brushing, zooming, tooltips on dense series. At that point a library earns its
weight.

## 7. No till integration

**Decision.** Demand comes from a seeded generator, not from sales data, and the
page says so plainly.

**Why.** There is no access to a store's data, and a prototype that quietly
implies otherwise is worse than one that is honest about it. Determinism gives
the same benefit for demonstration purposes: two people comparing numbers see
the same numbers.

**What would change it.** A data sharing agreement. The scenario module is the
only thing that would be replaced; the engine takes the same inputs either way.

## 8. A single light theme

**Decision.** The page commits to one light palette and paints every colour
explicitly, with no dark variant.

**Why.** It is a document to be read, not an application to be lived in. A
second theme doubles the contrast checking and the review surface for no gain to
a reader who opens the page once.

**What would change it.** The handset view becoming a real tool used on a shop
floor. A colleague working a chilled aisle at ten at night has a reasonable
claim on a dark theme.
