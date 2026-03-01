import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const databaseUrl = configService.get('DATABASE_URL');
  
  // If DATABASE_URL is provided, use it (for Neon, Railway, etc.)
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: configService.get('NODE_ENV') !== 'production',
      logging: configService.get('NODE_ENV') === 'development',
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  // Fallback to individual connection parameters
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_NAME', 'technician_marketplace'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') === 'development',
  };
}
