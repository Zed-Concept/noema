# Evidence — 002c owner smoke test (Unit A, CTRL-002)

**This directory is deliberately empty of results.** It is a slot, not a
record. It holds the one Unit A check no agent can perform: whether the app
appears on a screen when a human runs it.

Until something lands here beside this README, claim 15 of the Unit A evidence
— *the app renders on a device, simulator, or browser* — stays **NOT RUN**, in
`../002b-fix-loop/README.md`, in `docs/02-roles/OPERATIONS.md`, and anywhere
else it is repeated. An empty slot is the honest state, not an oversight.

## Why an agent cannot fill it

Everything an agent can prove about running this app has been proved, and none
of it is rendering:

| Proven | Where |
|---|---|
| `npm ci` installs the committed lockfile | `../002b-fix-loop/environment.txt` and the gate transcripts beside it |
| `expo export --platform all` produces iOS, Android and web bundles | `../002b-fix-loop/expo-export.txt` |
| The dev server starts and answers HTTP 200 on `/`, with the placeholder screen's own strings in the markup it serves | `../002c-fix-loop-2/dev-server.txt` |

The third is the closest an agent gets, and it still is not rendering. That
markup is produced by Expo Router's static rendering inside Node. No browser
performed layout, no device mounted a React Native view, and no pixels were
drawn. A page that server-renders correctly can still be blank in a browser.

## The procedure

Written out in full in `docs/02-roles/OPERATIONS.md` under **Owner smoke test**.
In short:

```
npm ci
npm run web             # equivalently: npx expo start --web
```

Expected: the placeholder home screen renders — `Placeholder home screen` above
`Edit src/app/index.tsx to replace this.`, centred, nothing else on the page.

The device target (`npm start`, then Expo Go) is worth more if only one is run:
it exercises React Native rather than react-native-web, and it is the only
target where the `ZC App (dev)` name is user-visible. On web the name is not on
screen at all — the skeleton leaves the document title empty — so a web-only
attestation should not claim to have seen it.

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

**Empty as of 2026-08-18.** Waiting on the owner. This is the last NOT RUN on
the Unit A skeleton that a person can close; the other one, CI, closes itself
when the pull request opens.
