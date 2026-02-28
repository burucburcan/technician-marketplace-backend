import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as sgMail from '@sendgrid/mail'

export interface EmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly fromEmail: string
  private readonly isEnabled: boolean

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY')
    this.fromEmail =
      this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@technician-marketplace.com'
    this.isEnabled = !!apiKey && apiKey !== 'your-sendgrid-api-key'

    if (this.isEnabled && apiKey) {
      sgMail.setApiKey(apiKey)
      this.logger.log('SendGrid email service initialized')
    } else {
      this.logger.warn('SendGrid API key not configured. Email notifications will be logged only.')
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.isEnabled) {
        this.logger.log(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`)
        return
      }

      const msg: any = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
      }

      // SendGrid requires either text, html, or content property
      if (options.html) {
        msg.html = options.html
      } else if (options.text) {
        msg.text = options.text
      } else {
        msg.text = ''
      }

      await sgMail.send(msg)
      this.logger.log(`Email sent successfully to ${options.to}`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`, error.stack)
      throw error
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<void> {
    try {
      if (!this.isEnabled) {
        this.logger.log(`[MOCK BULK EMAIL] Sending ${emails.length} emails`)
        return
      }

      const messages = emails.map(email => {
        const msg: any = {
          to: email.to,
          from: this.fromEmail,
          subject: email.subject,
        }

        // SendGrid requires either text, html, or content property
        if (email.html) {
          msg.html = email.html
        } else if (email.text) {
          msg.text = email.text
        } else {
          msg.text = ''
        }

        return msg
      })

      await sgMail.send(messages)
      this.logger.log(`Bulk emails sent successfully (${emails.length} emails)`)
    } catch (error) {
      this.logger.error(`Failed to send bulk emails: ${error.message}`, error.stack)
      throw error
    }
  }
}
