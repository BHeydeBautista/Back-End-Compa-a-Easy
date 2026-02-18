import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

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

    return this.transporter;
  }

  async sendEmailVerification(toEmail: string, token: string, name?: string) {
    const frontend = this.getFrontendBaseUrl();
    const link = `${frontend}/auth/verify-email?token=${encodeURIComponent(token)}`;

    const from = this.config.get<string>('SMTP_FROM');
    const isProd = (this.config.get<string>('NODE_ENV') ?? 'development') === 'production';

    const transporter = this.ensureTransporter();

    if (!transporter || !from) {
      if (isProd) {
        throw new Error('SMTP is not configured (SMTP_HOST/SMTP_FROM)');
      }

      this.logger.warn(`SMTP not configured. Verification link for ${toEmail}: ${link}`);
      return { ok: true, dev: true };
    }

    const safeName = (name ?? '').trim();
    const greeting = safeName ? `Hola ${safeName},` : 'Hola,';

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Verifica tu correo',
      text: `${greeting}\n\nPara activar tu cuenta, verifica tu correo visitando este enlace:\n${link}\n\nSi tú no creaste esta cuenta, puedes ignorar este email.`,
      html: `
        <p>${greeting}</p>
        <p>Para activar tu cuenta, verifica tu correo haciendo click aquí:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Si tú no creaste esta cuenta, puedes ignorar este email.</p>
      `.trim(),
    });

    return { ok: true };
  }
}
