import { IsString, MinLength } from 'class-validator'

export class ReplyToReviewDto {
  @IsString()
  @MinLength(10)
  reply: string
}
