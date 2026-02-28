import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../app.module'
import { DataSource } from 'typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { UserRole, ProfessionalType, VerificationStatus } from '../../common/enums'

describe('Admin Controller (Integration)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let adminToken: string
  let adminUserId: string
  let testUserId: string
  let testProfessionalId: string
  let testSupplierId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)

    // Create admin user
    const adminUser = await dataSource.getRepository(User).save({
      email: 'admin@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isSuspended: false,
    })
    adminUserId = adminUser.id

    // Create admin profile
    await dataSource.getRepository(UserProfile).save({
      userId: adminUserId,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      language: 'en',
    })

    // Login as admin
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@test.com',
      password: 'hashedpassword',
    })

    adminToken = loginResponse.body.accessToken

    // Create test regular user
    const testUser = await dataSource.getRepository(User).save({
      email: 'testuser@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.USER,
      isEmailVerified: true,
      isSuspended: false,
    })
    testUserId = testUser.id

    await dataSource.getRepository(UserProfile).save({
      userId: testUserId,
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567891',
      language: 'en',
    })

    // Create test professional
    const professionalUser = await dataSource.getRepository(User).save({
      email: 'professional@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.USER,
      isEmailVerified: true,
      isSuspended: false,
    })

    await dataSource.getRepository(UserProfile).save({
      userId: professionalUser.id,
      firstName: 'Professional',
      lastName: 'User',
      phone: '+1234567892',
      language: 'en',
    })

    const professional = await dataSource.getRepository(ProfessionalProfile).save({
      user: professionalUser,
      professionalType: ProfessionalType.HANDYMAN,
      businessName: 'Test Professional',
      experienceYears: 5,
      hourlyRate: 50,
      serviceRadius: 25,
      verificationStatus: VerificationStatus.VERIFIED,
      isAvailable: true,
      rating: 4.5,
      totalJobs: 10,
      completionRate: 0.95,
    })
    testProfessionalId = professional.id

    // Create test supplier
    const supplierUser = await dataSource.getRepository(User).save({
      email: 'supplier@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.PROVIDER,
      isEmailVerified: true,
      isSuspended: false,
    })

    const supplier = await dataSource.getRepository(SupplierProfile).save({
      user: supplierUser,
      companyName: 'Test Supplier',
      contactEmail: 'supplier@test.com',
      contactPhone: '+1234567893',
      verificationStatus: VerificationStatus.VERIFIED,
      rating: 4.0,
      totalOrders: 20,
      responseRate: 0.9,
    })
    testSupplierId = supplier.id
  })

  afterAll(async () => {
    // Clean up
    await dataSource.getRepository(ProfessionalProfile).delete({})
    await dataSource.getRepository(SupplierProfile).delete({})
    await dataSource.getRepository(UserProfile).delete({})
    await dataSource.getRepository(User).delete({})
    await app.close()
  })

  describe('GET /admin/users', () => {
    it('should list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('limit')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.total).toBeGreaterThanOrEqual(4) // admin + test user + professional + supplier
    })

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ role: UserRole.ADMIN })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      expect(response.body.data[0].role).toBe(UserRole.ADMIN)
    })

    it('should search users by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ search: 'testuser' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      expect(response.body.data[0].email).toContain('testuser')
    })

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(2)
      expect(response.body.data.length).toBeLessThanOrEqual(2)
    })
  })

  describe('GET /admin/providers', () => {
    it('should list all providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('total')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.total).toBeGreaterThanOrEqual(1)
    })

    it('should search providers by company name', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/providers')
        .query({ search: 'Test Supplier' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      expect(response.body.data[0].companyName).toContain('Test Supplier')
    })
  })

  describe('GET /admin/professionals', () => {
    it('should list all professionals', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/professionals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('total')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.total).toBeGreaterThanOrEqual(1)
    })

    it('should filter professionals by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/professionals')
        .query({ professionalType: ProfessionalType.HANDYMAN })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      expect(response.body.data[0].professionalType).toBe(ProfessionalType.HANDYMAN)
    })

    it('should search professionals by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/professionals')
        .query({ search: 'Professional' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('PUT /admin/users/:id/suspend', () => {
    it('should suspend a user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: true,
          reason: 'Test suspension',
        })
        .expect(200)

      expect(response.body.isSuspended).toBe(true)

      // Verify user is suspended
      const user = await dataSource.getRepository(User).findOne({ where: { id: testUserId } })
      expect(user).not.toBeNull()
      expect(user!.isSuspended).toBe(true)
    })

    it('should unsuspend a user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: false,
        })
        .expect(200)

      expect(response.body.isSuspended).toBe(false)

      // Verify user is not suspended
      const user = await dataSource.getRepository(User).findOne({ where: { id: testUserId } })
      expect(user).not.toBeNull()
      expect(user!.isSuspended).toBe(false)
    })

    it('should not allow admin to suspend themselves', async () => {
      await request(app.getHttpServer())
        .put(`/admin/users/${adminUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: true,
          reason: 'Self suspension',
        })
        .expect(400)
    })

    it('should not allow suspending other admins', async () => {
      // Create another admin
      const anotherAdmin = await dataSource.getRepository(User).save({
        email: 'admin2@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isSuspended: false,
      })

      await request(app.getHttpServer())
        .put(`/admin/users/${anotherAdmin.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isSuspended: true,
          reason: 'Admin suspension',
        })
        .expect(400)

      // Clean up
      await dataSource.getRepository(User).delete({ id: anotherAdmin.id })
    })
  })

  describe('DELETE /admin/users/:id', () => {
    it('should delete a user', async () => {
      // Create a user to delete
      const userToDelete = await dataSource.getRepository(User).save({
        email: 'delete@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.USER,
        isEmailVerified: true,
        isSuspended: false,
      })

      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.message).toContain('deleted successfully')

      // Verify user is deleted
      const user = await dataSource.getRepository(User).findOne({ where: { id: userToDelete.id } })
      expect(user).toBeNull()
    })

    it('should not allow admin to delete themselves', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
    })

    it('should not allow deleting other admins', async () => {
      // Create another admin
      const anotherAdmin = await dataSource.getRepository(User).save({
        email: 'admin3@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isSuspended: false,
      })

      await request(app.getHttpServer())
        .delete(`/admin/users/${anotherAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)

      // Clean up
      await dataSource.getRepository(User).delete({ id: anotherAdmin.id })
    })

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  describe('Authorization', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401)
    })

    it('should require admin role', async () => {
      // Login as regular user
      const userLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'testuser@test.com',
        password: 'hashedpassword',
      })

      const userToken = userLoginResponse.body.accessToken

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })
  })
})
