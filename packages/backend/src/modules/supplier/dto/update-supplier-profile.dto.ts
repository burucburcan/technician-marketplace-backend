import { PartialType } from '@nestjs/mapped-types'
import { CreateSupplierProfileDto } from './create-supplier-profile.dto'

export class UpdateSupplierProfileDto extends PartialType(CreateSupplierProfileDto) {}
