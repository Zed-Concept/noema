// Ruling 24: the one-time code is relayed by the owner at runtime from the
// Mailtrap sandbox UI. The producer reads it from an interactive prompt —
// never from a committed file, never from an environment variable — and
// registers it for redaction at source before returning it to the caller.
//
// The typed code appears only in the owner's own terminal. It is registered
// with the redactor the moment it is read, so no transcript line can carry it.
import { createInterface } from 'node:readline/promises';

export async function promptForCode(redactor, { emailPlaceholder, realEmail }) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      // The real address is printed to the owner's terminal only (they need it
      // to find the message); the transcript records the placeholder form.
      const answer = await rl.question(
        `\n  → In the Mailtrap sandbox UI, open the newest message to\n` +
          `    ${realEmail}  (transcripts record it as ${emailPlaceholder})\n` +
          `    and type the one-time code here, then press Enter: `,
      );
      const code = answer.trim();
      if (/^\d{6}$/.test(code)) {
        redactor.registerCounted(code, 'otp-code');
        return code;
      }
      process.stdout.write(
        `    That was not a 6-digit code (attempt ${attempt}/3). Try again.\n`,
      );
    }
    throw new Error('no valid 6-digit code was provided after 3 attempts');
  } finally {
    rl.close();
  }
}

/**
 * The contingency gate for one extra captured message. The stated run budget
 * is fixed before the first send; consuming one more message is an explicit
 * owner action at the terminal, never an automatic retry.
 */
export async function ownerAuthorisesResend(reason) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `\n  ${reason}\n` +
        `  Type RESEND to consume ONE more captured message, or anything else to abort: `,
    );
    return answer.trim() === 'RESEND';
  } finally {
    rl.close();
  }
}
