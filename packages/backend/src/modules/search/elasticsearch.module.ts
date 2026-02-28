import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Client } from '@elastic/elasticsearch'

export const ELASTICSEARCH_CLIENT = 'ELASTICSEARCH_CLIENT'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      useFactory: (configService: ConfigService) => {
        const client = new Client({
          node: configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200'),
          auth: {
            username: configService.get<string>('ELASTICSEARCH_USERNAME', 'elastic'),
            password: configService.get<string>('ELASTICSEARCH_PASSWORD', 'changeme'),
          },
        })
        return client
      },
      inject: [ConfigService],
    },
  ],
  exports: [ELASTICSEARCH_CLIENT],
})
export class ElasticsearchModule {}
