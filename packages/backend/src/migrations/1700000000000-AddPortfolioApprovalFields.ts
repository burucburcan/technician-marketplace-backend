import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddPortfolioApprovalFields1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add approval_status column
    await queryRunner.addColumn(
      'portfolio_items',
      new TableColumn({
        name: 'approval_status',
        type: 'enum',
        enum: ['pending', 'approved', 'rejected'],
        default: "'pending'",
      })
    )

    // Add rejection_reason column
    await queryRunner.addColumn(
      'portfolio_items',
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      })
    )

    // Add reviewed_by column
    await queryRunner.addColumn(
      'portfolio_items',
      new TableColumn({
        name: 'reviewed_by',
        type: 'uuid',
        isNullable: true,
      })
    )

    // Add reviewed_at column
    await queryRunner.addColumn(
      'portfolio_items',
      new TableColumn({
        name: 'reviewed_at',
        type: 'timestamp',
        isNullable: true,
      })
    )

    // Add updated_at column
    await queryRunner.addColumn(
      'portfolio_items',
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('portfolio_items', 'updated_at')
    await queryRunner.dropColumn('portfolio_items', 'reviewed_at')
    await queryRunner.dropColumn('portfolio_items', 'reviewed_by')
    await queryRunner.dropColumn('portfolio_items', 'rejection_reason')
    await queryRunner.dropColumn('portfolio_items', 'approval_status')
  }
}
