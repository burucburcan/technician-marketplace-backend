import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Set NODE_OPTIONS to prefer IPv4 DNS resolution
  if (process.env.NODE_ENV === 'production' && !process.env.NODE_OPTIONS?.includes('dns-result-order')) {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --dns-result-order=ipv4first';
  }

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
    extra: process.env.NODE_ENV === 'production' ? {
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      statement_timeout: 10000,
    } : undefined,
  };
}
