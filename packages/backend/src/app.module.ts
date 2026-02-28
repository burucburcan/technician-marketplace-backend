import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { getDatabaseConfig } from './config/database.config'
import { getSecurityConfig } from './config/security.config'
import { MongodbModule } from './modules/mongodb/mongodb.module'
import { SessionModule } from './modules/session/session.module'
import { AuthModule } from './modules/auth/auth.module'
import { UserModule } from './modules/user/user.module'
import { ActivityLogModule } from './modules/activity-log/activity-log.module'
import { SearchModule } from './modules/search/search.module'
import { BookingModule } from './modules/booking/booking.module'
import { NotificationModule } from './modules/notification/notification.module'
import { RatingModule } from './modules/rating/rating.module'
import { MessagingModule } from './modules/messaging/messaging.module'
import { MapModule } from './modules/map/map.module'
import { ProviderModule } from './modules/provider/provider.module'
import { AdminModule } from './modules/admin/admin.module'
import { SupplierModule } from './modules/supplier/supplier.module'
import { ProductModule } from './modules/product/product.module'
import { PaymentModule } from './modules/payment/payment.module'
import { I18nModule } from './i18n'
import { SecurityMiddleware } from './common/middleware/security.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    // Global rate limiting with default configuration
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute (default for API endpoints)
      },
    ]),
    I18nModule,
    MongodbModule,
    SessionModule,
    AuthModule,
    UserModule,
    ActivityLogModule,
    SearchModule,
    BookingModule,
    NotificationModule,
    RatingModule,
    MessagingModule,
    MapModule,
    ProviderModule,
    AdminModule,
    SupplierModule,
    ProductModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply throttler guard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer.apply(SecurityMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL })
  }
}
