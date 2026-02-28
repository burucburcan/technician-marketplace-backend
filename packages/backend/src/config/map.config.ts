import { ConfigService } from '@nestjs/config'

export const getMapConfig = (configService: ConfigService) => ({
  apiKey: configService.get<string>('GOOGLE_MAPS_API_KEY'),
})
