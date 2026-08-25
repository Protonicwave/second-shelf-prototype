# Contributing

## Branching

`main` is protected and always deployable. Work happens on a branch named for
the change, `feat/`, `fix/` or `chore/` followed by a short slug, and lands
through a pull request.

## Commits

Conventional Commits, imperative mood, lower case subject, no full stop, subject
under 72 characters. Scope is the package where it applies.

```
feat(engine): add markdown timing engine and plan search
fix(web): keep the chart labels inside the viewport at narrow widths
```

Add a body only where the change needs explaining.

## Verifying

One command, at the repository root, and nothing else counts as done.

```sh
npm run verify
```

It runs the type checker, the linter, the tests and the build, in that order,
and stops at the first failure. The same command runs in continuous integration
on every push and pull request.

## Standards

TypeScript strict everywhere, no `any`, no non-null assertions. Named exports
only. The engine package keeps zero runtime dependencies. Prose in the
repository is UK English.
