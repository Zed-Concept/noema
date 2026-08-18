# Owner smoke test — attestation

**Result: PASS.** The app renders.

| Field | Value |
|---|---|
| Who | Ahmed (owner) |
| When | 2026-08-18 |
| Target | Web — Chrome on macOS, read from the supplied screenshot rather than stated in the attestation text |
| Commit | `68c14d1ffea2ce55d8ca66247d711c04957c2625` (`feat/app-skeleton`) |
| Procedure | `npm ci`, then `npm run web`, per `docs/02-roles/OPERATIONS.md` |

## What appeared

> Owner smoke test, web, at 68c14d1 — renders. Placeholder home screen
> displayed, no error overlay, clean hydration. Observed: document title
> shows "index" (route name), not empty — amend the web-title note
> accordingly. — Owner, 2026-08-18

A screenshot was supplied with this attestation. It shows the browser at
`localhost:8081` with a header bar reading **index** across the top of the
content area, and the placeholder screen centred below it: **Placeholder home
screen** above **Edit src/app/index.tsx to replace this.** No error overlay, no
red screen, no blank page.

## Install transcript

`npm ci` added 1,085 packages and audited 1,086 in 3m, with the expected
deprecation warnings from Expo's transitive tree and the **22 vulnerabilities
(7 moderate, 15 high)** that are already on record as controller-accepted and
pre-existing. `expo start --web` started Metro, printed the QR code and
`Web: http://localhost:8081`, and bundled without error. The browser console
line `Running application "main" with appParams: {"hydrate": undefined,
"rootTag": "#root"}` is the client mounting.

## What this attestation corrected

The owner's run falsified two statements this loop had written about the page.
Both were mine, both were wrong, and both are now fixed at the source:

1. **"The browser tab shows the URL."** It shows **`index`**. The `<title>` is
   genuinely empty in the markup the server sends — `dev-server.txt` captured
   that correctly — but Expo Router sets it on the client after hydration, to
   the route name. A server-side capture cannot see a client-side title, and I
   generalised from it anyway.
2. **"There is no navigation bar."** There is. The root `<Stack />` in
   `src/app/_layout.tsx` renders a header, titled with the route name, so
   `index` appears above the placeholder text. This was in the served markup all
   along, at `aria-level="1" role="heading"`; I checked the markup for the
   placeholder strings and did not look for anything else.

The dev-server evidence is not retracted — every check it recorded still holds.
What failed was the prose around it. This is the concrete reason the rendering
claim needed a human: an agent describing a screen from server-side markup will
describe it confidently and partly wrongly.

## Adjacent, reported not acted on

The header bar and the browser tab both read **`index`** — the route filename
leaking into user-visible chrome. It is not what a user should see, and it is
not a defect this fix loop introduced or was scoped to fix. It wants a screen
title on the route (and a document title for web) whenever Unit A's placeholder
is replaced with real UI. Handing it to the controller as a finding, not fixing
it here.

## Scope of this attestation

Web only. **Not run:** iOS Simulator, Android emulator, and Expo Go on a
physical device. The `ZC App (dev)` name is therefore still unobserved by a
human — it is not visible on the web target at all, so only the Expo Go run
could confirm it. That check remains open and is the one place `ZC App (dev)`
would show.
