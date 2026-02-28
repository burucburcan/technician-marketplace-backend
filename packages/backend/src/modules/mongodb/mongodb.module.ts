import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as mongoose from 'mongoose'
import { getMongoConfig } from '../../config/mongodb.config'
import { ConversationSchema, ActivityLogSchema } from '../../schemas'

@Global()
@Module({
  providers: [
    {
      provide: 'MONGODB_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const uri = getMongoConfig(configService)
        return mongoose.connect(uri)
      },
      inject: [ConfigService],
    },
    {
      provide: 'CONVERSATION_MODEL',
      useFactory: (connection: typeof mongoose) => {
        return connection.model('Conversation', ConversationSchema)
      },
      inject: ['MONGODB_CONNECTION'],
    },
    {
      provide: 'ACTIVITY_LOG_MODEL',
      useFactory: (connection: typeof mongoose) => {
        return connection.model('ActivityLog', ActivityLogSchema)
      },
      inject: ['MONGODB_CONNECTION'],
    },
  ],
  exports: ['MONGODB_CONNECTION', 'CONVERSATION_MODEL', 'ACTIVITY_LOG_MODEL'],
})
export class MongodbModule {}
