import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async sendResetPassword(to: string, resetUrl: string) {
    const from =
      this.config.get<string>('RESEND_FROM') ??
      'Talk Eli <onboarding@resend.dev>';
    const subject = 'Recupera tu contraseña — Talk Eli';
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#091d4b">
        <h1 style="font-size:20px;margin:0 0 8px">Talk Eli</h1>
        <p style="font-size:15px;color:#1c447a">Hola,</p>
        <p style="font-size:15px;color:#1c447a">
          Recibimos una solicitud para restablecer tu contraseña. Pulsa el botón
          para elegir una nueva (el enlace caduca en 1 hora):
        </p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2c69b7;color:#fff;text-decoration:none;border-radius:12px;font-weight:600">
          Restablecer contraseña
        </a>
        <p style="font-size:13px;color:#5d7db4">
          Si no solicitaste esto, ignora este correo.
        </p>
      </div>
    `;

    if (!this.client) {
      this.logger.warn(`[DEV] Enlace de recuperación para ${to}: ${resetUrl}`);
      return;
    }

    const { error } = await this.client.emails.send({
      from,
      to,
      subject,
      html,
    });
    if (error) {
      this.logger.error(`Error enviando email a ${to}: ${error.message}`);
      throw new Error('No se pudo enviar el correo de recuperación');
    }
  }
}
