# Evidence — 002c owner smoke test (Unit A, CTRL-002)

**Filled 2026-08-18 — see `attestation.md`. Result: PASS on web.** This
directory holds the one Unit A check no agent can perform: whether the app
appears on a screen when a human runs it.

The owner ran the web target at `68c14d1` and the placeholder home screen
rendered, with no error overlay and clean hydration. That closes the rendering
claim for **web only**; iOS Simulator, Android emulator and Expo Go on a
physical device are still unrun, and Expo Go is the only target where the
`ZC App (dev)` name is user-visible, so that particular observation is still
outstanding.

The attestation also **corrected two things this loop had written** about what
the page looks like — the browser tab reads `index`, not the URL, and there *is*
a header bar. Both are fixed at the source now; the detail is in
`attestation.md`.

## Why an agent could not fill it

Everything an agent can prove about running this app was proved, and none of it
was rendering:

| Proven | Where |
|---|---|
| `npm ci` installs the committed lockfile | `../002b-fix-loop/environment.txt` and the gate transcripts beside it |
| `expo export --platform all` produces iOS, Android and web bundles | `../002b-fix-loop/expo-export.txt` |
| The dev server starts and answers HTTP 200 on `/`, with the placeholder screen's own strings in the markup it serves | `../002c-fix-loop-2/dev-server.txt` |

The third is the closest an agent gets, and it still is not rendering. That
markup is produced by Expo Router's static rendering inside Node. No browser
performed layout, no device mounted a React Native view, and no pixels were
drawn. A page that server-renders correctly can still be blank in a browser.

The gap turned out to be more than theoretical. The server-side capture was
accurate about everything it checked and the prose built on it was wrong twice
over, in both directions — it missed a header bar that was in the markup, and it
asserted a browser-tab behaviour that only the client determines. That is what
the human run was for.

## The procedure, for the targets still open

Written out in full in `docs/02-roles/OPERATIONS.md` under **Owner smoke test**.
The web target is done; this is what was run, and what a device run repeats:

```
npm ci
npm run web             # equivalently: npx expo start --web
```

Expected, as confirmed on web: a header bar titled `index`, and below it the
placeholder home screen — `Placeholder home screen` above `Edit
src/app/index.tsx to replace this.`, centred. The browser tab also reads
`index`.

**The device target (`npm start`, then Expo Go) is the one still worth
running.** It exercises React Native rather than react-native-web, and it is the
only target where the `ZC App (dev)` name is user-visible. On web the name is
not on screen anywhere, so the web attestation correctly does not claim it.

## What the attestation has to say

A screenshot named `web.png` or `device.png` is ideal and self-explanatory. If
there is no screenshot, a file `attestation.md` in this directory saying at
minimum:

- **who** ran it (the owner, by name),
- **when** — a date,
- **which target** — web browser, iOS Simulator, Android emulator, or Expo Go
  on a physical device, and which OS and browser or device,
- **which commit** — `git rev-parse HEAD` at the time of the run,
- **what appeared** — in the owner's own words, enough to tell a rendered
  placeholder screen from a blank page or an error overlay,
- **whether the `ZC App (dev)` name was visible**, and where, if the device
  target was used.

Then say so plainly: PASS, or FAIL with what actually happened.

## If it fails

A failure here is a Unit A defect, not an owner problem, and it is more
valuable than a pass. Record it in the same shape — the error text, the red
screen, the blank tab, whatever appeared — and hand it back to the controller
as a finding against this branch. Do not treat a failed smoke test as a reason
to withhold the attestation; the record of the failure *is* the evidence.

## Status

**Web: PASS, 2026-08-18, `attestation.md`.** Device and simulator targets: still
unrun, and with them the only user-visible sighting of `ZC App (dev)`. CI is the
other outstanding NOT RUN, and it closes itself when the pull request opens.
