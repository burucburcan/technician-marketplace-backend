import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddProviderIdToProfessionalProfile1704900000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'professional_profiles',
      new TableColumn({
        name: 'provider_id',
        type: 'uuid',
        isNullable: true,
      })
    )

    // Add index for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_professional_profiles_provider_id" ON "professional_profiles" ("provider_id")`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_professional_profiles_provider_id"`)
    await queryRunner.dropColumn('professional_profiles', 'provider_id')
  }
}
