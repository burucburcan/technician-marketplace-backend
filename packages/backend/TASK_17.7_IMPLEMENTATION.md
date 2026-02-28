# Task 17.7: Artist Portfolio Approval System Implementation

## Overview
Implemented the artist portfolio approval system that allows admins to review and approve/reject portfolio items uploaded by artists.

## Implementation Details

### 1. Database Schema Changes

#### New Enum: ApprovalStatus
- **File**: `src/common/enums/approval-status.enum.ts`
- **Values**: `PENDING`, `APPROVED`, `REJECTED`

#### Updated Entity: PortfolioItem
- **File**: `src/entities/portfolio-item.entity.ts`
- **New Fields**:
  - `approvalStatus`: Enum field (default: PENDING)
  - `rejectionReason`: Optional text field for rejection notes
  - `reviewedBy`: UUID of admin who reviewed
  - `reviewedAt`: Timestamp of review
  - `updatedAt`: Auto-updated timestamp

#### Migration
- **File**: `src/migrations/1700000000000-AddPortfolioApprovalFields.ts`
- Adds all approval-related columns to `portfolio_items` table

### 2. API Endpoints

All endpoints require admin authentication (`@Roles(UserRole.ADMIN)`).

#### GET /admin/portfolios/pending
Lists portfolio items awaiting approval.

**Query Parameters**:
- `search` (optional): Search by title, category, or artist name
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response**:
```typescript
{
  data: PortfolioItem[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

#### PUT /admin/portfolios/:id/approve
Approves a pending portfolio item.

**Body**:
```typescript
{
  notes?: string  // Optional approval notes
}
```

**Response**: Updated PortfolioItem with `approvalStatus: APPROVED`

**Validations**:
- Portfolio must exist (404 if not found)
- Portfolio must be in PENDING status (400 if already approved/rejected)

#### PUT /admin/portfolios/:id/reject
Rejects a pending portfolio item.

**Body**:
```typescript
{
  reason: string  // Required rejection reason
}
```

**Response**: Updated PortfolioItem with `approvalStatus: REJECTED`

**Validations**:
- Portfolio must exist (404 if not found)
- Portfolio must be in PENDING status (400 if already approved/rejected)
- Reason is required (400 if missing)

### 3. Service Layer

#### AdminService Methods

**listPendingPortfolios(filters, adminId)**
- Queries portfolio items with `approvalStatus = PENDING`
- Joins with professional, user, and profile data
- Supports search filtering across multiple fields
- Implements pagination
- Logs activity

**approvePortfolio(portfolioId, approveDto, adminId)**
- Validates portfolio exists and is pending
- Updates status to APPROVED
- Records reviewer and timestamp
- Clears any previous rejection reason
- Logs activity

**rejectPortfolio(portfolioId, rejectDto, adminId)**
- Validates portfolio exists and is pending
- Updates status to REJECTED
- Records rejection reason, reviewer, and timestamp
- Logs activity

### 4. DTOs

#### ListPendingPortfoliosDto
```typescript
{
  search?: string
  page?: number (default: 1, min: 1)
  limit?: number (default: 20, min: 1)
}
```

#### ApprovePortfolioDto
```typescript
{
  notes?: string
}
```

#### RejectPortfolioDto
```typescript
{
  reason: string (required)
}
```

### 5. Activity Logging

All portfolio approval actions are logged:
- `pending_portfolios_listed`: When admin views pending list
- `portfolio_approved`: When portfolio is approved
- `portfolio_rejected`: When portfolio is rejected

Metadata includes:
- Portfolio title
- Professional ID
- Admin notes/rejection reason
- Filter parameters (for list action)

### 6. Module Configuration

Updated `AdminModule` to include:
- `PortfolioItem` entity in TypeORM imports
- All necessary dependencies

## Testing

### Unit Tests
**File**: `src/modules/admin/admin-portfolio.spec.ts`

**Coverage**:
- ✅ List pending portfolios
- ✅ Filter by search term
- ✅ Approve pending portfolio
- ✅ Reject pending portfolio
- ✅ Handle not found errors
- ✅ Handle already approved/rejected errors
- ✅ Validate required fields

**Results**: 10/10 tests passing

### Integration Tests
**File**: `src/modules/admin/admin-portfolio.integration.spec.ts`

**Coverage**:
- ✅ GET /admin/portfolios/pending endpoint
- ✅ Search filtering
- ✅ Pagination
- ✅ PUT /admin/portfolios/:id/approve endpoint
- ✅ PUT /admin/portfolios/:id/reject endpoint
- ✅ Authentication requirements
- ✅ Validation errors
- ✅ Complete approval workflow
- ✅ Complete rejection workflow

## Workflow

### Artist Portfolio Upload Flow
1. Artist uploads portfolio item → Status: PENDING
2. Portfolio item is hidden from public view
3. Admin receives notification (future enhancement)

### Admin Approval Flow
1. Admin navigates to pending portfolios list
2. Admin reviews portfolio item details
3. Admin either:
   - **Approves**: Item becomes visible in artist profile
   - **Rejects**: Item remains hidden, artist sees rejection reason

### Status Transitions
```
PENDING → APPROVED (one-way, cannot be reversed)
PENDING → REJECTED (one-way, cannot be reversed)
```

## Security

- All endpoints require JWT authentication
- Role-based access control (admin only)
- UUID validation for portfolio IDs
- Input validation on all DTOs
- Activity logging for audit trail

## Database Considerations

### Indexes (Recommended)
```sql
CREATE INDEX idx_portfolio_approval_status ON portfolio_items(approval_status);
CREATE INDEX idx_portfolio_reviewed_by ON portfolio_items(reviewed_by);
CREATE INDEX idx_portfolio_reviewed_at ON portfolio_items(reviewed_at);
```

### Default Behavior
- New portfolio items default to `PENDING` status
- Existing portfolio items (if any) will need migration to set initial status

## Future Enhancements

1. **Notifications**: Send notifications to artists when portfolios are approved/rejected
2. **Bulk Actions**: Allow admins to approve/reject multiple items at once
3. **Review History**: Track all review attempts and changes
4. **Auto-approval**: Implement ML-based content moderation for trusted artists
5. **Appeal Process**: Allow artists to appeal rejections
6. **Review Comments**: Add internal admin notes visible only to other admins
7. **Statistics**: Dashboard showing approval rates, pending count, etc.

## Validates Requirements

This implementation validates **Requirement 9.7**:
> "THE Platform SHALL admin'e sanatçı portfolyolarını inceleme ve onaylama yetkisi vermelidir"
> (The Platform SHALL give admin the authority to review and approve artist portfolios)

## Related Tasks

- Task 5.7-5.8: Portfolio item entity and upload functionality
- Task 17: Admin management panel
- Task 17.6: Dispute management system (similar patterns)

## Files Modified/Created

### Created
- `src/common/enums/approval-status.enum.ts`
- `src/modules/admin/dto/list-pending-portfolios.dto.ts`
- `src/modules/admin/dto/approve-portfolio.dto.ts`
- `src/modules/admin/dto/reject-portfolio.dto.ts`
- `src/modules/admin/admin-portfolio.spec.ts`
- `src/modules/admin/admin-portfolio.integration.spec.ts`
- `src/migrations/1700000000000-AddPortfolioApprovalFields.ts`
- `TASK_17.7_IMPLEMENTATION.md`

### Modified
- `src/common/enums/index.ts`
- `src/entities/portfolio-item.entity.ts`
- `src/modules/admin/dto/index.ts`
- `src/modules/admin/admin.service.ts`
- `src/modules/admin/admin.controller.ts`
- `src/modules/admin/admin.module.ts`

## Notes

- The implementation follows existing patterns from dispute management (Task 17.6)
- Activity logging is consistent with other admin actions
- Error handling follows NestJS best practices
- All endpoints are properly typed and validated
- Tests provide comprehensive coverage of happy paths and error cases
