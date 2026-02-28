import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { MessageType } from '../../../common/enums'

export class SendMessageDTO {
  @IsUUID()
  conversationId: string

  @IsString()
  content: string

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType

  @IsString()
  @IsOptional()
  fileUrl?: string
}
