# Second Shelf

Supermarkets throw away fresh food that was always going to sell, and reduce food
that was never going to. The decision of when to cut a price, and by how much, is
usually made by habit rather than by evidence: a fixed reduction at a fixed hour,
applied to every line on the shelf. This prototype replaces that habit with a
small decision engine that searches the markdown timings available for each
product line and picks the plan that recovers the most value, then shows the
result against what a store does today.

Live demo: to follow.

## Running it

Requires Node 22 or later.

```sh
npm install
npm run verify
```

`npm run verify` runs the type checker, the linter, the tests and the build, in
that order, and stops at the first failure.
