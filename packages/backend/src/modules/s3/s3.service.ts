import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import * as sharp from 'sharp'

@Injectable()
export class S3Service {
  private s3Client: S3Client
  private bucketName: string

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1')
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME')

    if (!accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('AWS credentials and bucket name must be configured')
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
    this.bucketName = bucketName
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File): Promise<string> {
    const fileExtension = file.originalname.split('.').pop()
    const fileName = `profile-photos/${userId}/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await this.s3Client.send(command)
    return `https://${this.bucketName}.s3.amazonaws.com/${fileName}`
  }

  async deleteProfilePhoto(userId: string): Promise<void> {
    // List all objects with the user's profile photo prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: `profile-photos/${userId}/`,
    })

    const objects = await this.s3Client.send(listCommand)

    if (objects.Contents && objects.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key })),
        },
      })

      await this.s3Client.send(deleteCommand)
    }
  }

  async uploadCertificate(professionalId: string, file: Express.Multer.File): Promise<string> {
    const fileExtension = file.originalname.split('.').pop()
    const fileName = `certificates/${professionalId}/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await this.s3Client.send(command)
    return `https://${this.bucketName}.s3.amazonaws.com/${fileName}`
  }

  async uploadPortfolioImage(artistId: string, file: Express.Multer.File): Promise<string> {
    const fileExtension = file.originalname.split('.').pop()
    const fileName = `portfolio/${artistId}/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await this.s3Client.send(command)
    return `https://${this.bucketName}.s3.amazonaws.com/${fileName}`
  }

  /**
   * Upload and optimize portfolio image with multiple sizes
   * Returns URLs for both full-size optimized image and thumbnail
   */
  async uploadOptimizedPortfolioImage(
    artistId: string,
    file: Express.Multer.File
  ): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    const fileId = uuidv4()

    // Optimize full-size image (max 1920x1920, quality 85)
    const optimizedImage = await sharp(file.buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    // Create thumbnail (300x300, quality 80)
    const thumbnail = await sharp(file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Upload full-size optimized image
    const imageFileName = `portfolio/${artistId}/${fileId}.jpg`
    const imageCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: imageFileName,
      Body: optimizedImage,
      ContentType: 'image/jpeg',
    })
    await this.s3Client.send(imageCommand)

    // Upload thumbnail
    const thumbnailFileName = `portfolio/${artistId}/${fileId}_thumb.jpg`
    const thumbnailCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: thumbnailFileName,
      Body: thumbnail,
      ContentType: 'image/jpeg',
    })
    await this.s3Client.send(thumbnailCommand)

    return {
      imageUrl: `https://${this.bucketName}.s3.amazonaws.com/${imageFileName}`,
      thumbnailUrl: `https://${this.bucketName}.s3.amazonaws.com/${thumbnailFileName}`,
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extract key from URL
    const url = new URL(fileUrl)
    const key = url.pathname.substring(1) // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.s3Client.send(command)
  }

  /**
   * Generic file upload method for any file type
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileExtension = file.originalname.split('.').pop()
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await this.s3Client.send(command)
    return `https://${this.bucketName}.s3.amazonaws.com/${fileName}`
  }
}
