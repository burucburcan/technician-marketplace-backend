import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PaymentController } from './payment.controller'
import { WebhookController } from './webhook.controller'
import { PaymentService } from './payment.service'
import { StripeService } from './stripe.service'
import { EscrowService } from './escrow.service'
import { InvoiceService } from './invoice.service'
import { PayoutService } from './payout.service'
import { Payment } from '../../entities/payment.entity'
import { Booking } from '../../entities/booking.entity'
import { Order } from '../../entities/order.entity'
import { Invoice } from '../../entities/invoice.entity'
import { Receipt } from '../../entities/receipt.entity'
import { Balance } from '../../entities/balance.entity'
import { Payout } from '../../entities/payout.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Booking,
      Order,
      Invoice,
      Receipt,
      Balance,
      Payout,
      ProfessionalProfile,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    NotificationModule,
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, StripeService, EscrowService, InvoiceService, PayoutService],
  exports: [PaymentService, StripeService, EscrowService, InvoiceService, PayoutService],
})
export class PaymentModule {}
