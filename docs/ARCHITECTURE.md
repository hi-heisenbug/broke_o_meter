# Architecture

Broke-O-Meter is a fully client-side single-page app. There is no backend; OCR,
proof construction, and verification all run in the browser. The code is split
into small ES modules so each concern is independently readable and testable.

## Module map

```
index.html                 Markup + GA bootstrap + <link>/<script type=module> entry
src/
├── main.js                Entry point: exposes inline handlers on window, wires
│                          the upload zone, warms up the OCR engine
└── lib/
    ├── config.js          Static config: currencies, GA id, CDN/API endpoints
    ├── state.js           Shared mutable app state (single object instance)
    ├── dom.js             $(), delay(), loadScript()
    ├── crypto.js          sha256(), randomHex() (WebCrypto via globalThis)
    ├── zkp.js             Pure proof core: buildProof(), verifyProofString()
    ├── currency.js        Currency select, formatting, FX conversion, detection
    ├── threshold.js       Preset + custom threshold selection
    ├── ocr.js             Screenshot ingestion, native/Tesseract OCR, extraction
    ├── proof.js           Proof UI: animated steps, certificate, share, verify
    ├── mascots.js         Eye-tracking mascots, confetti, "sorry" toast
    └── ui.js              Survey chip interactions
test/
└── zkp.test.js            Unit tests for the cryptographic core
```

## Why `window` exposure in `main.js`

The markup keeps its original inline `onclick="generateProof()"`-style handlers.
ES modules are scoped, so the functions those attributes reference would not be
visible globally. `main.js` therefore assigns the handler functions onto
`window`. This preserves the exact DOM/markup and behaviour of the original
single-file app while keeping the source modular.

## Shared state

`state.js` exports a single `state` object. Because ES module bindings are live
and the object reference is shared, every module reads and writes the same
values — a direct, behaviour-preserving replacement for the original top-level
`let` globals.

## The proof core (`zkp.js`)

`zkp.js` has no DOM dependencies, which is what makes it unit-testable under
Node's test runner. It uses `globalThis.crypto` so the identical code path runs
in the browser (`globalThis === window`) and in Node 18+ (WebCrypto built in).

```
balance · salt · threshold ─▶ SHA-256 commitment
                                   │
                                   ▼
            commit · nonce · ts ─▶ SHA-256 challenge
                                   │
                                   ▼
        challenge · balance · salt ─▶ SHA-256 response ─▶ slice(32)
                                                              │
                            isBroke · responseShort ─▶ SHA-256 validityHash ─▶ slice(32)
                                                              │
        commitShort · threshold · validityHash ─▶ SHA-256 metaHash ─▶ slice(16)
```

The emitted string never contains the balance. Verification re-derives the
validity hash for both `broke=true` and `broke=false` and accepts whichever
matches; the meta hash guards against tampering. See the proof string table in
[../README.md](../README.md).

## Build & runtime

The app runs as native ES modules with no build step (all imports are relative
with explicit `.js` extensions). `vite build` is provided for an optimized,
hashed, minified production bundle in `dist/`.
