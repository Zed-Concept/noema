# Unit F device attestation — template

Fill each field in your own words; copy error text verbatim. Do not include
the staging URL, any key, any token, or any one-time code value. The
disposable `unitf-device-*@example.com` address is fine to include (it is a
sandbox-captured template identity, never a mailbox). When complete, paste
the whole thing into the builder session; it is committed verbatim as
`owner-attestation.md` under a builder-added header.

```
Device model:            (e.g. iPhone 15 Pro)
iOS version:             (Settings → General → About)
Expo Go version:         (shown on Expo Go's home/settings screen)
Date and local time:     
Sandbox meter before:    (messages used, of 50)

Step 2 — first launch:
  Sign-in screen appeared directly (yes/no):
  Notes:

Step 3 — sign-in:
  Address used:
  The code arrived as a six-digit code, not a link (yes/no):
  Approximate time from Send code to signed-in:
  Home screen showed "Signed in as <address>" (yes/no):
  Any error text, verbatim:

Step 4 — kill and relaunch:
  Restored signed-in with no code prompt (yes/no):
  Notes (loading flash, errors):

Step 5 — locked window:
  App foregrounded at lock time (yes/no):
  Lock time:
  Unlock time:
  Locked at least 11 minutes (yes/no):

Step 6 — after unlock:
  What you saw (still signed in / bounced to sign-in / other — describe):
  Expo Go reloaded the bundle (loading bar) (yes/no):
  Any error text, verbatim:

Step 7 — sign out:
  Returned to sign-in screen (yes/no):
  Any error text, verbatim:

Step 8 — kill and relaunch after sign-out:
  Sign-in screen (not home) after relaunch (yes/no):
  Notes:

Step 9 — sandbox meter after:  (messages used, of 50)

Anything else you observed, in your own words:
```
