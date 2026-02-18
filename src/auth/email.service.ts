import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private loggedSmtpConfig = false;
  private loggedResendConfig = false;
  private loggedResendMissing = false;
  private loggedBrevoConfig = false;
  private loggedBrevoMissing = false;

  constructor(private readonly config: ConfigService) {}

  private getFrontendBaseUrl() {
    const raw =
      this.config.get<string>('FRONTEND_URL') ??
      this.config.get<string>('NEXT_PUBLIC_FRONTEND_URL') ??
      'http://localhost:3000';
    return raw.replace(/\/+$/, '');
  }

  private ensureTransporter() {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    // People often paste Gmail App Passwords with spaces. Normalize it.
    const passRaw = this.config.get<string>('SMTP_PASS');
    const pass = passRaw ? String(passRaw).replace(/\s+/g, '') : undefined;
    const secureEnv = (this.config.get<string>('SMTP_SECURE') ?? '').toLowerCase();
    const secure = secureEnv === 'true' || secureEnv === '1' ? true : port === 465;

    if (!host) return null;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      // Prevent very long hangs on bad SMTP configs.
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
      auth: user && pass ? { user, pass } : undefined,
    } as any);

    if (!this.loggedSmtpConfig) {
      this.loggedSmtpConfig = true;
      this.logger.log(
        `SMTP configured: host=${host} port=${port} secure=${secure} user=${user ? '[set]' : '[missing]'} from=${this.config.get<string>('SMTP_FROM') ? '[set]' : '[missing]'}`,
      );
    }

    return this.transporter;
  }

  private async sendViaResend(params: {
    toEmail: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM');
    if (!apiKey || !from) return { ok: false as const, configured: false as const };

    if (!this.loggedResendConfig) {
      this.loggedResendConfig = true;
      this.logger.log(
        `Resend configured: apiKey=[set] from=${from ? '[set]' : '[missing]'}`,
      );
    }

    const timeoutMs = Number(
      this.config.get<string>('RESEND_TIMEOUT_MS') ?? 15_000,
    );

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.toEmail],
          subject: params.subject,
          text: params.text,
          html: params.html,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Resend failed: ${res.status} ${body || res.statusText}`);
      }

      return { ok: true as const, configured: true as const };
    } finally {
      clearTimeout(id);
    }
  }

  private async sendViaBrevo(params: {
    toEmail: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const fromEmail = this.config.get<string>('BREVO_FROM_EMAIL');
    const fromName = this.config.get<string>('BREVO_FROM_NAME') ?? 'Compañia Easy';
    if (!apiKey || !fromEmail) {
      return { ok: false as const, configured: false as const };
    }

    if (!this.loggedBrevoConfig) {
      this.loggedBrevoConfig = true;
      this.logger.log(
        `Brevo configured: apiKey=[set] fromEmail=${fromEmail ? '[set]' : '[missing]'}`,
      );
    }

    const timeoutMs = Number(
      this.config.get<string>('BREVO_TIMEOUT_MS') ?? 15_000,
    );

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [{ email: params.toEmail }],
          subject: params.subject,
          htmlContent: params.html,
          textContent: params.text,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Brevo failed: ${res.status} ${body || res.statusText}`);
      }

      return { ok: true as const, configured: true as const };
    } finally {
      clearTimeout(id);
    }
  }

  async sendEmailVerification(toEmail: string, token: string, name?: string) {
    const frontend = this.getFrontendBaseUrl();
    const link = `${frontend}/auth/verify-email?token=${encodeURIComponent(token)}`;

    const safeName = (name ?? '').trim();
    const greeting = safeName ? `Hola ${safeName},` : 'Hola,';
    const subject = 'Verifica tu correo';
    const text = `${greeting}\n\nPara activar tu cuenta, verifica tu correo visitando este enlace:\n${link}\n\nSi tú no creaste esta cuenta, puedes ignorar este email.`;
    const html = `
        <p>${greeting}</p>
        <p>Para activar tu cuenta, verifica tu correo haciendo click aquí:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Si tú no creaste esta cuenta, puedes ignorar este email.</p>
      `.trim();

    // Prefer Brevo (HTTP) when configured (works on hosts that block SMTP, and can be used without owning a domain).
    try {
      const brevo = await this.sendViaBrevo({
        toEmail,
        subject,
        text,
        html,
      });

      if (brevo.ok) {
        return { ok: true };
      }

      if (!this.loggedBrevoMissing) {
        this.loggedBrevoMissing = true;
        this.logger.warn(
          'Brevo is not configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL to send emails via HTTPS without needing SMTP.',
        );
      }
    } catch (err) {
      this.logger.error(
        `Brevo send failed (to=${toEmail}) message=${String((err as any)?.message ?? err)}`,
      );
      // Continue to other providers.
    }

    // Prefer Resend (HTTP) when configured (hosting providers often block SMTP).
    try {
      const resend = await this.sendViaResend({
        toEmail,
        subject,
        text,
        html,
      });

      if (resend.ok) {
        return { ok: true };
      }

      if (!this.loggedResendMissing) {
        this.loggedResendMissing = true;
        this.logger.warn(
          'Resend is not configured. Set RESEND_API_KEY and RESEND_FROM to avoid SMTP blocks on some hosts (e.g. Render). Falling back to SMTP.',
        );
      }
    } catch (err) {
      this.logger.error(
        `Resend send failed (to=${toEmail}) message=${String((err as any)?.message ?? err)}`,
      );
      // Continue to SMTP fallback.
    }

    const from = this.config.get<string>('SMTP_FROM');
    const isProd =
      (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';
    const sendTimeoutMs = Number(
      this.config.get<string>('SMTP_SEND_TIMEOUT_MS') ?? 20_000,
    );

    const transporter = this.ensureTransporter();

    if (!transporter || !from) {
      if (isProd) {
        throw new Error(
          'No email provider configured (set RESEND_API_KEY/RESEND_FROM or SMTP_HOST/SMTP_FROM)',
        );
      }

      this.logger.warn(
        `Email not configured. Verification link for ${toEmail}: ${link}`,
      );
      return { ok: true, dev: true };
    }

    // Validate SMTP connection/auth quickly to fail fast with a useful server-side log.
    try {
      await withTimeout(Promise.resolve(transporter.verify() as any), 10_000, 'SMTP_VERIFY');
    } catch (err) {
      const anyErr = err as any;
      this.logger.error(
        `SMTP verify failed (to=${toEmail}) code=${anyErr?.code ?? 'n/a'} responseCode=${anyErr?.responseCode ?? 'n/a'} message=${String(anyErr?.message ?? err)}`,
      );
      throw err;
    }

    await withTimeout(
      transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text,
        html,
      }),
      sendTimeoutMs,
      'SMTP_SENDMAIL',
    );

    return { ok: true };
  }
}
