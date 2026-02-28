import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
  IsUUID,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ProfessionalType } from '../../../common/enums/professional-type.enum'

class TimeSlotDto {
  @IsString()
  @IsNotEmpty()
  start: string // HH:mm format

  @IsString()
  @IsNotEmpty()
  end: string // HH:mm format
}

class WorkingHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  monday: TimeSlotDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  tuesday: TimeSlotDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  wednesday: TimeSlotDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  thursday: TimeSlotDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  friday: TimeSlotDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  saturday: TimeSlotDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  sunday: TimeSlotDto[]
}

export class CreateProfessionalProfileDto {
  @IsEnum(ProfessionalType)
  @IsNotEmpty()
  professionalType: ProfessionalType

  @IsOptional()
  @IsString()
  businessName?: string

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  specializationIds: string[] // Service category IDs

  @IsNumber()
  @Min(0)
  @Max(50)
  experienceYears: number

  @IsNumber()
  @Min(0)
  hourlyRate: number

  @IsNumber()
  @Min(1)
  @Max(100)
  serviceRadius: number // km

  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours: WorkingHoursDto

  // Artist-specific fields
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artStyle?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techniques?: string[]
}
