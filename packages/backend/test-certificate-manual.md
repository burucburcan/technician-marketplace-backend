# Certificate Management Manual Test Guide

This guide provides manual testing steps for the certificate management system.

## Prerequisites

1. Backend server is running
2. Database is set up and migrations are applied
3. You have a registered user with a professional profile

## Test Scenarios

### 1. Upload Certificate

**Endpoint:** `POST /users/professionals/:id/certificates`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Certificate file (PDF, JPEG, PNG, or WebP)
- `name`: Certificate name (e.g., "AWS Certified Solutions Architect")
- `issuer`: Certificate issuer (e.g., "Amazon Web Services")
- `issueDate`: Issue date in ISO format (e.g., "2023-01-15")
- `expiryDate`: (Optional) Expiry date in ISO format (e.g., "2026-01-15")

**Expected Response (201 Created):**
```json
{
  "id": "uuid",
  "professionalId": "uuid",
  "name": "AWS Certified Solutions Architect",
  "issuer": "Amazon Web Services",
  "issueDate": "2023-01-15",
  "expiryDate": "2026-01-15",
  "fileUrl": "https://bucket.s3.amazonaws.com/certificates/prof-id/file.pdf",
  "verifiedByAdmin": false,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**cURL Example:**
```bash
curl -X POST \
  http://localhost:3000/users/professionals/{professionalId}/certificates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/certificate.pdf" \
  -F "name=AWS Certified Solutions Architect" \
  -F "issuer=Amazon Web Services" \
  -F "issueDate=2023-01-15" \
  -F "expiryDate=2026-01-15"
```

### 2. Get All Certificates

**Endpoint:** `GET /users/professionals/:id/certificates`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "professionalId": "uuid",
    "name": "AWS Certified Solutions Architect",
    "issuer": "Amazon Web Services",
    "issueDate": "2023-01-15",
    "expiryDate": "2026-01-15",
    "fileUrl": "https://bucket.s3.amazonaws.com/certificates/prof-id/file.pdf",
    "verifiedByAdmin": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "uuid",
    "professionalId": "uuid",
    "name": "Google Cloud Professional",
    "issuer": "Google Cloud",
    "issueDate": "2023-03-20",
    "expiryDate": null,
    "fileUrl": "https://bucket.s3.amazonaws.com/certificates/prof-id/file2.pdf",
    "verifiedByAdmin": true,
    "createdAt": "2024-03-20T14:15:00.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET \
  http://localhost:3000/users/professionals/{professionalId}/certificates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Cases to Test

### 1. Invalid File Type
Upload a file with unsupported type (e.g., .txt, .zip)

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed"
}
```

### 2. File Too Large
Upload a file larger than 5MB

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "File size too large. Maximum size is 5MB"
}
```

### 3. Unauthorized Access
Try to upload certificate to another user's professional profile

**Expected Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "You can only upload certificates to your own profile"
}
```

### 4. Professional Profile Not Found
Use a non-existent professional ID

**Expected Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Professional profile not found"
}
```

### 5. Missing Authentication
Make request without Authorization header

**Expected Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Validation Tests

### Valid File Types
- ✅ PDF (.pdf)
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ WebP (.webp)

### Invalid File Types
- ❌ Text (.txt)
- ❌ Word (.doc, .docx)
- ❌ Excel (.xls, .xlsx)
- ❌ ZIP (.zip)
- ❌ Executable (.exe)

### File Size Limits
- ✅ 1MB file
- ✅ 4.9MB file
- ❌ 5.1MB file
- ❌ 10MB file

## Integration with Professional Profile

After uploading certificates, verify they appear in the professional profile:

**Endpoint:** `GET /users/professionals/:id/profile`

The response should include the certificates in the `certificates` array:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "professionalType": "handyman",
  "businessName": "Professional Services",
  "certificates": [
    {
      "id": "uuid",
      "name": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "fileUrl": "https://...",
      "verifiedByAdmin": false
    }
  ],
  ...
}
```

## Activity Log Verification

Check that certificate uploads are logged in the activity log:

**Expected Log Entry:**
```json
{
  "userId": "uuid",
  "action": "certificate_uploaded",
  "resource": "certificate",
  "metadata": {
    "certificateId": "uuid",
    "professionalId": "uuid",
    "name": "AWS Certified Solutions Architect"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## S3 Storage Verification

Verify that files are stored in S3 with the correct structure:
- Path: `certificates/{professionalId}/{uuid}.{extension}`
- Public read access (if configured)
- Correct content type

## Notes

- Certificates are ordered by creation date (newest first)
- The `verifiedByAdmin` field is set to `false` by default
- Admin verification is handled separately (not part of this task)
- Certificate files are stored permanently in S3
- No delete endpoint is implemented in this task (can be added later if needed)
