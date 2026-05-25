# Broke-O-Meter

**Zero Knowledge Proof of Poverty.**

Prove your bank balance is below a threshold without revealing the actual number. OCR runs client-side, the proof is cryptographic, and nothing leaves the browser.

Live at [broke.heisenbug.ai](https://broke.heisenbug.ai)

---

## How it works

### Full flow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#464646',
    'primaryBorderColor': '#93cb52',
    'lineColor': '#1c9770',
    'secondaryColor': '#bef3e2',
    'tertiaryColor': '#f2eeee',
    'edgeLabelBackground': '#ffffff',
    'fontSize': '14px'
  }
}}%%
flowchart LR
    A[User uploads<br/>screenshot] --> B[Tesseract.js OCR<br/>runs in browser]
    B --> C{Amount<br/>found?}
    C -- Yes --> D[Display extracted balance<br/>only to prover]
    C -- No --> E[Manual input fallback]
    E --> D
    D --> F[Select threshold<br/>and currency]
    F --> G[Generate ZK Proof]
    G --> H[Balance discarded<br/>from memory]
    H --> I[Proof string output<br/>no balance inside]
    I --> J[Verifier pastes<br/>proof string]
    J --> K[Re-derive<br/>expected hashes]
    K --> L{Hashes<br/>match?}
    L -- Yes --> M[VERIFIED]
    L -- No --> N[Rejected]

    classDef default fill:#ffffff,stroke:#93cb52,stroke-width:1.5px,color:#464646
    classDef decision fill:#bef3e2,stroke:#1c9770,stroke-width:1.5px,color:#1c9770
    classDef crypto fill:#1c9770,stroke:#1c9770,stroke-width:1.5px,color:#ffffff
    classDef success fill:#93cb52,stroke:#7aaa3f,stroke-width:1.5px,color:#ffffff
    classDef reject fill:#f2eeee,stroke:#464646,stroke-width:1.5px,color:#464646

    class C,L decision
    class G,K crypto
    class M success
    class N reject
```

---

### ZK Proof construction

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#464646',
    'primaryBorderColor': '#93cb52',
    'lineColor': '#1c9770',
    'secondaryColor': '#bef3e2',
    'tertiaryColor': '#f2eeee',
    'edgeLabelBackground': '#ffffff',
    'fontSize': '13px'
  }
}}%%
flowchart LR
    A([balance · salt · threshold]) --> B[SHA-256<br/>Commitment]
    B --> C[SHA-256<br/>Challenge]
    C --> D[SHA-256<br/>Response]
    D --> E[Slice 32]
    E --> F[SHA-256<br/>ValidityHash]
    F --> G[Slice 32]
    B --> H[Slice 32]
    H --> I[SHA-256<br/>MetaHash]
    I --> J[Slice 16]
    G --> K([Proof String])
    J --> K

    classDef default fill:#ffffff,stroke:#93cb52,stroke-width:1.5px,color:#464646
    classDef hash fill:#1c9770,stroke:#1c9770,color:#ffffff,stroke-width:1.5px
    classDef slice fill:#bef3e2,stroke:#1c9770,color:#1c9770,stroke-width:1px
    classDef io fill:#464646,stroke:#464646,color:#ffffff,stroke-width:1.5px
    classDef output fill:#93cb52,stroke:#7aaa3f,color:#ffffff,stroke-width:1.5px

    class B,C,D,F,I hash
    class E,G,H,J slice
    class A io
    class K output
```

The balance is used during construction but is not present in the output string. The verifier re-derives `validityHash` independently for both `true` and `false` states and checks which one matches.

This is a simulated Pedersen commitment + Fiat-Shamir scheme implemented with SHA-256 using the Web Crypto API. The proof string is a chain of hashes derived from `balance + salt + threshold`, while the balance itself never appears in output. During verification, the verifier re-derives expected hashes for both `broke = true` and `broke = false` and accepts whichever one matches.

---

### Verification logic

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#464646',
    'primaryBorderColor': '#93cb52',
    'lineColor': '#1c9770',
    'secondaryColor': '#bef3e2',
    'tertiaryColor': '#f2eeee',
    'edgeLabelBackground': '#ffffff',
    'fontSize': '14px'
  }
}}%%
flowchart LR
    A([Proof string]) --> B[Parse segments]
    B --> C[Re-derive metaHash]
    C --> D{metaHash<br/>matches?}
    D -- No --> E[Tampered]
    D -- Yes --> F[Re-derive<br/>expectedBroke]
    F --> G[Re-derive<br/>expectedNotBroke]
    G --> H{validityHash<br/>matches broke?}
    H -- Yes --> I[VERIFIED BROKE]
    H -- No --> J{validityHash matches<br/>not broke?}
    J -- Yes --> K[VERIFIED NOT BROKE]
    J -- No --> L[Hash mismatch]

    classDef default fill:#ffffff,stroke:#93cb52,stroke-width:1.5px,color:#464646
    classDef decision fill:#bef3e2,stroke:#1c9770,stroke-width:1.5px,color:#1c9770
    classDef crypto fill:#1c9770,stroke:#1c9770,color:#ffffff,stroke-width:1.5px
    classDef success fill:#93cb52,stroke:#7aaa3f,color:#ffffff,stroke-width:1.5px
    classDef reject fill:#f2eeee,stroke:#464646,color:#464646,stroke-width:1.5px
    classDef io fill:#464646,stroke:#464646,color:#ffffff,stroke-width:1.5px

    class D,H,J decision
    class F,G crypto
    class I,K success
    class E,L reject
    class A io
```

---

### Currency conversion flow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#464646',
    'primaryBorderColor': '#93cb52',
    'lineColor': '#1c9770',
    'secondaryColor': '#bef3e2',
    'tertiaryColor': '#f2eeee',
    'edgeLabelBackground': '#ffffff',
    'fontSize': '14px'
  }
}}%%
flowchart LR
    A([OCR amount]) --> B[Detect currency<br/>from text]
    B --> C[Store rawBalance<br/>rawCurrency]
    C --> D[User switches<br/>currency]
    D --> E{Cached?}
    E -- Yes --> F[Apply cached rate]
    E -- No --> G[Fetch live rate<br/>fawazahmed0 API]
    G --> H{Success?}
    H -- Yes --> I[Cache + apply rate]
    H -- No --> J[Show original<br/>with warning]
    F --> K([Update extractedBalance])
    I --> K

    classDef default fill:#ffffff,stroke:#93cb52,stroke-width:1.5px,color:#464646
    classDef decision fill:#bef3e2,stroke:#1c9770,stroke-width:1.5px,color:#1c9770
    classDef store fill:#1c9770,stroke:#1c9770,color:#ffffff,stroke-width:1.5px
    classDef success fill:#93cb52,stroke:#7aaa3f,color:#ffffff,stroke-width:1.5px
    classDef warn fill:#f2eeee,stroke:#464646,color:#464646,stroke-width:1.5px
    classDef io fill:#464646,stroke:#464646,color:#ffffff,stroke-width:1.5px

    class E,H decision
    class C,I store
    class K success
    class J warn
    class A io
```

`rawBalance` and `rawCurrency` are stored at OCR time and never mutated. `extractedBalance` is always the working value in the currently selected currency and feeds into proof generation.

---

## Proof string format

```
BOMPROOF:v3:T{threshold}:{commitShort}:{challengeShort}:{responseShort}:{validityHash}:{metaHash}
```

| Segment | Length | Contents |
|---|---|---|
| `BOMPROOF` | — | Format identifier |
| `v3` | — | Version |
| `T{n}` | — | Threshold value |
| `commitShort` | 32 chars | SHA-256 of `balance:salt:threshold`, sliced |
| `challengeShort` | 16 chars | SHA-256 of `commit:nonce:timestamp`, sliced |
| `responseShort` | 32 chars | SHA-256 of `challenge:balance:salt`, sliced |
| `validityHash` | 32 chars | SHA-256 of `bool:response`, sliced |
| `metaHash` | 16 chars | SHA-256 of `commit:threshold:validity`, sliced |

Balance is not present in any segment.

---

## Loopholes and caveats

The demo has an intentional trust loophole: screenshots can be edited, backdated, or belong to someone else, so the input is not tamper-proof.

Users can also edit the extracted amount after OCR, and can change it later before generating a proof.

A real implementation would integrate with India's Account Aggregator framework so balance data is pulled directly from the bank source, leaving no room for screenshot forgery.

This project is honest about scope: it is simulated ZK, not a full zk-SNARK circuit. The commitment-and-hash flow is cryptographically sound for this specific claim, but it does not provide the same formal guarantees as systems like Groth16 or PLONK.

---

## What makes it technically interesting

- Entirely client-side: no server, no data leaves the browser.
- Modular ES-module architecture with a pure, unit-tested ZK core (`src/lib/zkp.js`).
- Runs unbundled as native ES modules, *and* ships a Vite production build.
- Currency conversion support: fetches live rates and falls back gracefully.
- Portable, human-readable proof format: `BOMPROOF:v3:T{threshold}:...`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full module map.

---

## Tech stack

| Piece | What |
|---|---|
| OCR | [Tesseract.js](https://github.com/naptha/tesseract.js) v5, loaded dynamically (native `TextDetector` first) |
| Crypto | Web Crypto API — SHA-256 |
| ZKP | Pedersen commitment + Fiat-Shamir (simulated) |
| Currency rates | [@fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr |
| Fonts | DM Sans, Inter via Google Fonts |
| Build | [Vite](https://vitejs.dev) (optional — source runs unbundled too) |
| Tests | `node --test` (zero-dependency, WebCrypto) |
| Hosting | Vercel static |

No runtime framework. Plain ES modules. Build step optional.

---

## Running locally

```bash
git clone https://github.com/hi-heisenbug/broke_o_meter.git
cd broke_o_meter
npm install
npm run dev        # Vite dev server with HMR
```

Other useful scripts:

```bash
npm test           # unit tests for the ZK proof core
npm run lint       # eslint
npm run build      # production bundle into dist/
npm run preview    # preview the production build
```

Because the source is plain native ES modules, you can also serve it without a
build step — any static server works (e.g. `npx serve .`). Opening `index.html`
straight from the filesystem (`file://`) will not work, since browsers block ES
module loading over `file://`; use a local server.

---

## License

MIT
