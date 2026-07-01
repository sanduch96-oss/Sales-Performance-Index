import { Resend } from "resend";

const IS_DEV = process.env.NODE_ENV !== "production";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "SPI Platform <onboarding@resend.dev>";

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  if (IS_DEV) {
    console.log("\n========================================");
    console.log("  [DEV] COD DE VERIFICARE EMAIL");
    console.log(`  Destinatar : ${to}`);
    console.log(`  Cod        : ${code}`);
    console.log("========================================\n");
  }
  const resend = getClient();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Codul dvs. de confirmare — SPI",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e3a5f;margin-bottom:8px">Confirmare cont SPI</h2>
        <p style="color:#555;margin-bottom:24px">
          Introduceți codul de mai jos în platformă pentru a vă confirma adresa de e-mail.
          Codul este valabil <strong>15 minute</strong>.
        </p>
        <div style="background:#f0f4ff;border:1px solid #c7d7f9;border-radius:8px;padding:24px;text-align:center">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1e3a5f">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Dacă nu ați inițiat această acțiune, ignorați acest mesaj.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  if (IS_DEV) {
    console.log("\n========================================");
    console.log("  [DEV] COD RESETARE PAROLA");
    console.log(`  Destinatar : ${to}`);
    console.log(`  Cod        : ${code}`);
    console.log("========================================\n");
  }
  const resend = getClient();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Resetare parolă — SPI",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e3a5f;margin-bottom:8px">Resetare parolă SPI</h2>
        <p style="color:#555;margin-bottom:24px">
          Am primit o cerere de resetare a parolei. Introduceți codul de mai jos.
          Codul este valabil <strong>30 minute</strong>.
        </p>
        <div style="background:#fff0f0;border:1px solid #f9c7c7;border-radius:8px;padding:24px;text-align:center">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#b91c1c">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Dacă nu ați solicitat resetarea parolei, ignorați acest mesaj.
        </p>
      </div>
    `,
  });
}
