import { ConfigService } from '@nestjs/config'

export const getMongoConfig = (configService: ConfigService): string => {
  // If MONGODB_URI is provided, use it (for MongoDB Atlas, cloud deployments, etc.)
  const mongoUri = configService.get('MONGODB_URI')
  if (mongoUri) {
    return mongoUri
  }

  // Fallback to individual connection parameters for local development
  const host = configService.get('MONGO_HOST', 'localhost')
  const port = configService.get('MONGO_PORT', 27017)
  const database = configService.get('MONGO_DATABASE', 'technician_marketplace')
  const username = configService.get('MONGO_USERNAME', '')
  const password = configService.get('MONGO_PASSWORD', '')

  if (username && password) {
    return `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`
  }

  return `mongodb://${host}:${port}/${database}`
}
