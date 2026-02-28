import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as request from 'supertest'
import { AdminModule } from './admin.module'
import { AuthModule } from '../auth/auth.module'
import { ActivityLogModule } from '../activity-log/activity-log.module'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { UserRole, ProfessionalType, ApprovalStatus } from '../../common/enums'
import { DataSource } from 'typeorm'

describe('AdminController - Portfolio Approval (Integration)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let adminToken: string
  let adminUser: User
  let artistUser: User
  let artistProfile: ProfessionalProfile
  let pendingPortfolio: PortfolioItem

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'test',
          password: process.env.DB_PASSWORD || 'test',
          database: process.env.DB_NAME || 'test_db',
          entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        AdminModule,
        AuthModule,
        ActivityLogModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.query('DELETE FROM portfolio_items')
    await dataSource.query('DELETE FROM professional_profiles')
    await dataSource.query('DELETE FROM user_profiles')
    await dataSource.query('DELETE FROM users')

    // Create admin user
    adminUser = await dataSource.getRepository(User).save({
      email: 'admin@test.com',
      passwordHash: 'hashed_password',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    })

    await dataSource.getRepository(UserProfile).save({
      userId: adminUser.id,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      language: 'en',
    })

    // Create artist user
    artistUser = await dataSource.getRepository(User).save({
      email: 'artist@test.com',
      passwordHash: 'hashed_password',
      role: UserRole.PROFESSIONAL,
      isEmailVerified: true,
    })

    const artistUserProfile = await dataSource.getRepository(UserProfile).save({
      userId: artistUser.id,
      firstName: 'Test',
      lastName: 'Artist',
      phone: '+1234567891',
      language: 'en',
    })

    artistProfile = await dataSource.getRepository(ProfessionalProfile).save({
      userId: artistUser.id,
      professionalType: ProfessionalType.ARTIST,
      businessName: 'Test Art Studio',
      experienceYears: 5,
      hourlyRate: 50,
      serviceRadius: 50,
      isAvailable: true,
      rating: 0,
      totalJobs: 0,
      completionRate: 0,
    })

    // Create pending portfolio item
    pendingPortfolio = await dataSource.getRepository(PortfolioItem).save({
      professionalId: artistProfile.id,
      imageUrl: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      title: 'Test Artwork',
      description: 'A beautiful test artwork',
      category: 'painting',
      displayOrder: 1,
      approvalStatus: ApprovalStatus.PENDING,
    })

    // Get admin token
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@test.com',
      password: 'hashed_password',
    })

    adminToken = loginResponse.body.accessToken || 'mock-token'
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  describe('GET /admin/portfolios/pending', () => {
    it('should return pending portfolio items', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/portfolios/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('limit')
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.total).toBeGreaterThanOrEqual(1)
    })

    it('should filter by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/portfolios/pending?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data).toBeInstanceOf(Array)
    })

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/portfolios/pending?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(10)
    })

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/admin/portfolios/pending').expect(401)
    })
  })

  describe('PUT /admin/portfolios/:id/approve', () => {
    it('should approve a pending portfolio item', async () => {
      const response = await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Looks great!' })
        .expect(200)

      expect(response.body.approvalStatus).toBe(ApprovalStatus.APPROVED)
      expect(response.body.reviewedBy).toBe(adminUser.id)
      expect(response.body.reviewedAt).toBeDefined()

      // Verify in database
      const updated = await dataSource
        .getRepository(PortfolioItem)
        .findOne({ where: { id: pendingPortfolio.id } })

      expect(updated).toBeDefined()
      expect(updated?.approvalStatus).toBe(ApprovalStatus.APPROVED)
      expect(updated?.reviewedBy).toBe(adminUser.id)
    })

    it('should return 404 for non-existent portfolio', async () => {
      await request(app.getHttpServer())
        .put('/admin/portfolios/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(404)
    })

    it('should return 400 for already approved portfolio', async () => {
      // First approval
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200)

      // Second approval attempt
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400)
    })

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/approve`)
        .send({})
        .expect(401)
    })
  })

  describe('PUT /admin/portfolios/:id/reject', () => {
    it('should reject a pending portfolio item', async () => {
      const response = await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Inappropriate content' })
        .expect(200)

      expect(response.body.approvalStatus).toBe(ApprovalStatus.REJECTED)
      expect(response.body.rejectionReason).toBe('Inappropriate content')
      expect(response.body.reviewedBy).toBe(adminUser.id)
      expect(response.body.reviewedAt).toBeDefined()

      // Verify in database
      const updated = await dataSource
        .getRepository(PortfolioItem)
        .findOne({ where: { id: pendingPortfolio.id } })

      expect(updated).toBeDefined()
      expect(updated?.approvalStatus).toBe(ApprovalStatus.REJECTED)
      expect(updated?.rejectionReason).toBe('Inappropriate content')
      expect(updated?.reviewedBy).toBe(adminUser.id)
    })

    it('should return 400 if reason is missing', async () => {
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400)
    })

    it('should return 404 for non-existent portfolio', async () => {
      await request(app.getHttpServer())
        .put('/admin/portfolios/00000000-0000-0000-0000-000000000000/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test reason' })
        .expect(404)
    })

    it('should return 400 for already rejected portfolio', async () => {
      // First rejection
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'First rejection' })
        .expect(200)

      // Second rejection attempt
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Second rejection' })
        .expect(400)
    })

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/admin/portfolios/${pendingPortfolio.id}/reject`)
        .send({ reason: 'Test reason' })
        .expect(401)
    })
  })

  describe('Portfolio Approval Workflow', () => {
    it('should complete full approval workflow', async () => {
      // 1. List pending portfolios
      const listResponse = await request(app.getHttpServer())
        .get('/admin/portfolios/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(listResponse.body.total).toBeGreaterThanOrEqual(1)
      const portfolio = listResponse.body.data[0]

      // 2. Approve the portfolio
      const approveResponse = await request(app.getHttpServer())
        .put(`/admin/portfolios/${portfolio.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Approved' })
        .expect(200)

      expect(approveResponse.body.approvalStatus).toBe(ApprovalStatus.APPROVED)

      // 3. Verify it's no longer in pending list
      const listAfterResponse = await request(app.getHttpServer())
        .get('/admin/portfolios/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const stillPending = listAfterResponse.body.data.find((p: any) => p.id === portfolio.id)
      expect(stillPending).toBeUndefined()
    })

    it('should complete full rejection workflow', async () => {
      // 1. List pending portfolios
      const listResponse = await request(app.getHttpServer())
        .get('/admin/portfolios/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const portfolio = listResponse.body.data[0]

      // 2. Reject the portfolio
      const rejectResponse = await request(app.getHttpServer())
        .put(`/admin/portfolios/${portfolio.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Does not meet quality standards' })
        .expect(200)

      expect(rejectResponse.body.approvalStatus).toBe(ApprovalStatus.REJECTED)
      expect(rejectResponse.body.rejectionReason).toBe('Does not meet quality standards')

      // 3. Verify it's no longer in pending list
      const listAfterResponse = await request(app.getHttpServer())
        .get('/admin/portfolios/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const stillPending = listAfterResponse.body.data.find((p: any) => p.id === portfolio.id)
      expect(stillPending).toBeUndefined()
    })
  })
})
