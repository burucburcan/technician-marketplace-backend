import { IsNotEmpty } from 'class-validator'

export class UploadProfilePhotoDto {
  @IsNotEmpty()
  file: Express.Multer.File
}
