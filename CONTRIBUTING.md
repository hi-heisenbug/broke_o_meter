# Contributing

Thanks for your interest in Broke-O-Meter.

## Getting started

```bash
npm install
npm run dev       # start the Vite dev server
```

## Before opening a PR

```bash
npm test          # run the unit tests (node --test)
npm run lint      # eslint
npm run build     # ensure the production build succeeds
```

## Project conventions

- Plain ES modules, no framework. Keep imports relative with explicit `.js`
  extensions so the app also runs unbundled.
- Keep cryptographic logic in `src/lib/zkp.js` (pure, DOM-free) and add tests in
  `test/` for any change there.
- DOM/presentation code lives alongside the feature it serves (`ocr.js`,
  `proof.js`, `currency.js`, …). New inline HTML handlers must be exposed on
  `window` in `src/main.js`.
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module map.

## Scope

This is a demo of a privacy-preserving "proof of poverty" UX. It uses a
*simulated* ZK scheme (SHA-256 commitments + Fiat–Shamir), not a full zk-SNARK.
Please keep that framing honest in any user-facing copy.
