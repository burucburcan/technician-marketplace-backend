import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm'

export class CreateDisputesTable20260222202145 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dispute_status enum
    await queryRunner.query(`
      CREATE TYPE dispute_status AS ENUM ('open', 'in_review', 'resolved', 'closed');
    `)

    // Create issue_type enum
    await queryRunner.query(`
      CREATE TYPE issue_type AS ENUM ('no_show', 'poor_quality', 'damage', 'safety_concern', 'pricing_dispute', 'other');
    `)

    // Create disputes table
    await queryRunner.createTable(
      new Table({
        name: 'disputes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'booking_id',
            type: 'uuid',
          },
          {
            name: 'reporter_id',
            type: 'uuid',
          },
          {
            name: 'reported_user_id',
            type: 'uuid',
          },
          {
            name: 'issue_type',
            type: 'issue_type',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'photos',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'dispute_status',
            default: "'open'",
          },
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'admin_action',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolved_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    )

    // Add foreign keys
    await queryRunner.createForeignKey(
      'disputes',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bookings',
        onDelete: 'CASCADE',
      })
    )

    await queryRunner.createForeignKey(
      'disputes',
      new TableForeignKey({
        columnNames: ['reporter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    )

    await queryRunner.createForeignKey(
      'disputes',
      new TableForeignKey({
        columnNames: ['reported_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    )

    await queryRunner.createForeignKey(
      'disputes',
      new TableForeignKey({
        columnNames: ['resolved_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    )

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
      CREATE INDEX idx_disputes_reporter_id ON disputes(reporter_id);
      CREATE INDEX idx_disputes_status ON disputes(status);
      CREATE INDEX idx_disputes_issue_type ON disputes(issue_type);
      CREATE INDEX idx_disputes_created_at ON disputes(created_at);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_disputes_created_at;
      DROP INDEX IF EXISTS idx_disputes_issue_type;
      DROP INDEX IF EXISTS idx_disputes_status;
      DROP INDEX IF EXISTS idx_disputes_reporter_id;
      DROP INDEX IF EXISTS idx_disputes_booking_id;
    `)

    // Drop table (foreign keys will be dropped automatically)
    await queryRunner.dropTable('disputes')

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS issue_type;`)
    await queryRunner.query(`DROP TYPE IF EXISTS dispute_status;`)
  }
}
