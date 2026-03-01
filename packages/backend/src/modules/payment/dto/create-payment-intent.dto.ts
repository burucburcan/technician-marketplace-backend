import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional, IsObject } from 'class-validator'
import { InvoiceType } from '../../../common/enums/invoice-type.enum'

export class InvoiceDataDto {
  @IsNotEmpty()
  @IsString()
  customerName: string

  @IsOptional()
  @IsString()
  customerTaxId?: string

  @IsNotEmpty()
  @IsString()
  customerAddress: string

  @IsNotEmpty()
  @IsString()
  customerCity: string

  @IsNotEmpty()
  @IsString()
  customerCountry: string

  @IsNotEmpty()
  @IsString()
  customerPostalCode: string

  @IsNotEmpty()
  @IsString()
  customerEmail: string
}

export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsString()
  bookingId?: string

  @IsOptional()
  @IsString()
  orderId?: string

  @IsNotEmpty()
  @IsNumber()
  amount: number

  @IsNotEmpty()
  @IsString()
  currency: string

  @IsNotEmpty()
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType

  @IsOptional()
  @IsObject()
  invoiceData?: InvoiceDataDto
}
