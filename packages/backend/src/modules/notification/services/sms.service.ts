import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as twilio from 'twilio'

export interface SmsOptions {
  to: string
  message: string
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)
  private readonly client: twilio.Twilio
  private readonly fromNumber: string
  private readonly isEnabled: boolean

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '+1234567890'
    this.isEnabled =
      !!accountSid &&
      !!authToken &&
      accountSid !== 'your-twilio-account-sid' &&
      authToken !== 'your-twilio-auth-token'

    if (this.isEnabled) {
      this.client = twilio(accountSid, authToken)
      this.logger.log('Twilio SMS service initialized')
    } else {
      this.logger.warn('Twilio credentials not configured. SMS notifications will be logged only.')
    }
  }

  async sendSms(options: SmsOptions): Promise<void> {
    try {
      if (!this.isEnabled) {
        this.logger.log(`[MOCK SMS] To: ${options.to}, Message: ${options.message}`)
        return
      }

      const message = await this.client.messages.create({
        body: options.message,
        from: this.fromNumber,
        to: options.to,
      })

      this.logger.log(`SMS sent successfully to ${options.to}: ${message.sid}`)
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}: ${error.message}`, error.stack)
      throw error
    }
  }

  async sendBulkSms(messages: SmsOptions[]): Promise<void> {
    try {
      if (!this.isEnabled) {
        this.logger.log(`[MOCK BULK SMS] Sending ${messages.length} messages`)
        return
      }

      const promises = messages.map(msg =>
        this.client.messages.create({
          body: msg.message,
          from: this.fromNumber,
          to: msg.to,
        })
      )

      await Promise.all(promises)
      this.logger.log(`Bulk SMS sent successfully (${messages.length} messages)`)
    } catch (error) {
      this.logger.error(`Failed to send bulk SMS: ${error.message}`, error.stack)
      throw error
    }
  }
}
