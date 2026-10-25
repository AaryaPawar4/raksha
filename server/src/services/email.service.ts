import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailDispatchResult {
  accepted: boolean;
  messageId?: string;
  provider: string;
  providerResponse?: string;
  status: 'ACCEPTED_BY_PROVIDER' | 'FAILED' | 'UNAVAILABLE';
}

export class EmailService {
  private static transporter: Transporter | null = null;

  public static isConfigured(): boolean {
    if (EmailService.transporter !== null) return true;
    if (env.EMAIL_PROVIDER === 'mock') return true;
    if (env.EMAIL_PROVIDER === 'smtp') {
      return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
    }
    return false;
  }

  public static getProviderStatus(): {
    isConfigured: boolean;
    providerName: string;
    fromAddress: string;
  } {
    return {
      isConfigured: EmailService.isConfigured(),
      providerName: env.EMAIL_PROVIDER,
      fromAddress: env.EMAIL_FROM,
    };
  }

  private static getTransporter(): Transporter | null {
    if (EmailService.transporter) return EmailService.transporter;

    if (env.EMAIL_PROVIDER === 'mock') {
      EmailService.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return EmailService.transporter;
    }

    if (env.EMAIL_PROVIDER === 'smtp' && env.SMTP_HOST) {
      EmailService.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });
      return EmailService.transporter;
    }

    return null;
  }

  /**
   * Dispatches email with safe timeout and error boundary.
   * Never leaks secrets or credentials in error messages.
   */
  public static async sendMail(options: SendMailOptions): Promise<EmailDispatchResult> {
    if (!EmailService.isConfigured()) {
      return {
        accepted: false,
        provider: env.EMAIL_PROVIDER,
        status: 'UNAVAILABLE',
        providerResponse: 'Email provider is not configured. Please set EMAIL_PROVIDER and SMTP credentials in environment.',
      };
    }

    const transporter = EmailService.getTransporter();
    if (!transporter) {
      return {
        accepted: false,
        provider: env.EMAIL_PROVIDER,
        status: 'UNAVAILABLE',
        providerResponse: 'Email transporter initialization failed.',
      };
    }

    try {
      const info = await Promise.race([
        transporter.sendMail({
          from: env.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Email provider connection timeout (8s limit exceeded)')), 8000)
        ),
      ]);

      return {
        accepted: true,
        messageId: info.messageId,
        provider: env.EMAIL_PROVIDER,
        status: 'ACCEPTED_BY_PROVIDER',
        providerResponse: typeof info.response === 'string' ? info.response.slice(0, 100) : 'OK',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown provider error';
      return {
        accepted: false,
        provider: env.EMAIL_PROVIDER,
        status: 'FAILED',
        providerResponse: errorMessage.replace(/(password|key|token)=[^&\s]+/gi, '$1=[REDACTED]'),
      };
    }
  }

  // Helper for automated test suite injection
  public static setMockTransporter(mockTransporter: Transporter | null): void {
    EmailService.transporter = mockTransporter;
  }
}
