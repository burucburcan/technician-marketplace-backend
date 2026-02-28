import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MapService } from './map.service'
import { MapController } from './map.controller'

@Module({
  imports: [ConfigModule],
  controllers: [MapController],
  providers: [MapService],
  exports: [MapService],
})
export class MapModule {}
