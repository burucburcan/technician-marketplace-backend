import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator'

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'], { message: 'Language must be either "es" or "en"' })
  language?: string

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean

  @IsOptional()
  @IsString()
  @IsIn(['MXN', 'USD'], { message: 'Currency must be either "MXN" or "USD"' })
  currency?: string
}
