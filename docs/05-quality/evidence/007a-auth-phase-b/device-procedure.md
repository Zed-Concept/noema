# Unit F — the ADR-named locked-device test: owner procedure (iPhone, Expo Go)

**Why this exists.** ADR-007 named, and ADR-009 carries forward, a physical-
device test that gates Phase B exit: with a signed-in app, force a refresh
window across a locked interval and observe whether the session survives or a
re-authentication demand is raised. No device has ever participated
(PROJECT-STATE, 006d NOT RUN item 3). Ruling 23 set staging's JWT expiry to
600 seconds precisely so this test can force the window by keeping the phone
locked longer than ten minutes, without a test hook (learning 10).

**Who runs it.** The owner, on their iPhone, in Expo Go — the runtime
PROJECT-STATE names for this test. The builder authors this procedure and the
attestation template; the owner's completed attestation is committed verbatim
as `owner-attestation.md` with a builder-added header. If the owner is not
ready this session, the device claims are NOT RUN and this procedure remains
the deliverable.

**What it costs.** One captured message (one sign-in). The sandbox meter
reads against a 50-message ceiling; check it before starting and stop if it
is near 50.

**What can and cannot be observed here, stated up front.** A refused keychain
write during the locked window is observed **only if it happens**. "No
refusal occurred" is a valid PASS for recovery-after-lock and a NOT OBSERVED
for the refusal itself — it is never a claim that refusal cannot happen.
Expo Go stores SecureStore values inside Expo Go's own keychain namespace; a
standalone build's keychain behaviour is a recorded boundary of this
procedure, not measured by it.

---

## Preconditions

- This machine: repo at the `evidence/auth-phase-b` branch head, `.env`
  filled with the two staging values (owner-held), dependencies materialized
  (`npm ci` has run).
- iPhone: Expo Go installed (App Store), on the **same Wi-Fi network** as
  this machine.
- The Mailtrap sandbox UI open in a browser (for the one code relay).
- About 20 minutes, most of it the locked wait.

## Steps — observe and write down at each numbered step

Record observations in the attestation template (`attestation-template.md`),
in your own words, as you go. Exact screen wording matters; error text is
copied verbatim.

**1. Start the dev server.** In a terminal at the repo root:

```
npx expo start
```

Wait for the QR code. Write down: nothing yet (the server banner is
machine-side state).

**2. Open the app on the iPhone.** Scan the QR code with the Camera app;
open in Expo Go. The JS bundle builds and loads.

*Observe:* the app opens on the **Sign in** screen — a "Sign in" heading,
"We will email you a one-time code.", an email field, and a **Send code**
button. (Route protection: no session exists, so the app group redirects
here.) Write down: did the sign-in screen appear directly?

**3. Sign in with a relayed code.** Enter a fresh disposable address of the
form `unitf-device-1@example.com` (never a real mailbox; the sandbox captures
it — ruling 24). Tap **Send code**. In the Mailtrap sandbox UI, open the
newest message to that address and read the 6-digit code. Back in the app,
enter the code, tap **Verify code**.

*Observe:* the app moves to the home screen on its own — "Placeholder home
screen", **Signed in as `<the address you typed>`**, and a **Sign out**
button. Write down: the address you used, that the code arrived as a code
(six digits, not a link), roughly how long sign-in took, and any error text
verbatim if something failed.

**4. Kill and relaunch — session restored.** Swipe the app away in the app
switcher (a real process kill). Reopen it from Expo Go (recent project).

*Observe:* the home screen shows **Signed in as `<address>`** again — with
**no code prompt**. That is the session surviving a process restart through
the keychain-backed adapter. Write down: restored signed-in yes/no; any
loading flash or error text.

**5. The locked window — longer than the token's whole life.** With the app
**foregrounded** (home screen visible), press the side button to lock the
phone. Leave it locked for **at least 11 minutes** (set a timer; the JWT
expires at 600 seconds, so the access token that existed at lock time is
expired well before you return). Do not unlock early; do not charge-wake it.

Write down: lock time and unlock time (roughly, from the timer).

**6. Unlock and observe.** Unlock the phone; the app is still foregrounded.
Give it a few seconds.

*Observe and write down — either outcome is a valid record:*

- **Still signed in** ("Signed in as `<address>`" stays): the refresh path
  obtained a new token and its keychain write succeeded after unlock —
  recovery PASS, refusal NOT OBSERVED.
- **Bounced to the sign-in screen**: a re-authentication demand was raised —
  the write-refusal path fired. Copy any error text verbatim. This is the
  refusal OBSERVED — a finding to record precisely, not a procedure failure.
- Anything else (spinner, red error box, Expo Go reload): write down exactly
  what you saw. If Expo Go reloads the JS bundle on unlock (dev-server
  reconnect — a loading bar appears), the observation is still valid: a
  reload is a restart, and what you then see — signed in or sign-in screen —
  is the restart-path answer; note that the reload happened.

**7. Sign out.** Tap **Sign out**.

*Observe:* the app returns to the sign-in screen. If instead an error appears
("Could not sign out: …"), copy it verbatim — a refused sign-out with the
session still on disk is exactly what that screen is designed to surface.

**8. Kill and relaunch — signed out stays signed out.** Swipe the app away
again; reopen from Expo Go.

*Observe:* the **sign-in screen**, not the home screen — no session
resurrected from the keychain. Write down: yes/no.

**9. Meter.** Note the sandbox meter reading (messages used of 50).

---

## Afterwards

Fill the rest of `attestation-template.md` (device model, iOS version, Expo
Go version — Expo Go shows its version on its home/settings screen — date,
and the observations above). Paste the completed attestation into the
builder session; it is committed **verbatim** as `owner-attestation.md` with
a builder-added header. The builder does not edit your words.

Cleanup is owner-class, batched with the Node run's: deleting the
`unitf-*` users in the dashboard (Auth → Users) cascades away their rows.
