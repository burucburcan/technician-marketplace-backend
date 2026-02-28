# Notification Module

This module provides a comprehensive notification infrastructure for the Technician Marketplace Platform, supporting multiple notification channels including email, SMS, push notifications, and in-app notifications.

## Features

### 1. Multi-Channel Notifications
- **Email**: SendGrid integration for transactional emails
- **SMS**: Twilio integration for text messages
- **Push Notifications**: Placeholder for Firebase Cloud Messaging (to be implemented)
- **In-App**: Database-backed notification system

### 2. Notification Templates
- Bilingual support (Spanish and English)
- Template variables for dynamic content
- Separate templates for email, SMS, and in-app messages
- 14 notification types covering all platform events

### 3. User Preferences
- Users can control which channels they receive notifications on
- Users can control which notification types they receive
- Preferences stored in user profile (JSONB field)
- Respects user choices for email, SMS, and push notifications
- Granular control per notification type (e.g., disable booking reminders but keep confirmations)

## Notification Types

### Booking Notifications
- `BOOKING_CREATED`: New booking request received
- `BOOKING_CONFIRMED`: Booking confirmed by professional
- `BOOKING_REJECTED`: Booking rejected by professional
- `BOOKING_CANCELLED`: Booking cancelled by user or professional
- `BOOKING_REMINDER`: Reminder 24 hours before booking
- `BOOKING_STARTED`: Service started
- `BOOKING_COMPLETED`: Service completed, request for rating

### Messaging Notifications
- `NEW_MESSAGE`: New message received in conversation

### Rating Notifications
- `NEW_RATING`: New rating received by professional

### Payment Notifications
- `PAYMENT_RECEIVED`: Payment received for service
- `PAYOUT_PROCESSED`: Payout processed to professional's account

### System Notifications
- `ACCOUNT_VERIFIED`: Email verified successfully
- `PROFILE_APPROVED`: Professional profile approved by admin
- `PROFILE_REJECTED`: Professional profile rejected by admin

## API Endpoints

### Get User Notifications
```
GET /notifications
Query Parameters:
  - isRead: boolean (optional)
  - type: NotificationType (optional)
  - limit: number (optional, default: 50)
  - offset: number (optional, default: 0)
```

### Get Unread Count
```
GET /notifications/unread-count
```

### Mark Notification as Read
```
PUT /notifications/:id/read
```

### Mark All Notifications as Read
```
PUT /notifications/read-all
```

### Delete Notification
```
DELETE /notifications/:id
```

### Update Notification Preferences
```
PUT /notifications/preferences
Body: {
  emailNotifications?: boolean
  smsNotifications?: boolean
  pushNotifications?: boolean
  notificationTypes?: {
    [NotificationType]?: boolean
  }
}
```

### Get Notification Preferences
```
GET /notifications/preferences
```

## Usage

### Sending a Notification

```typescript
import { NotificationService } from './modules/notification/notification.service';
import { NotificationType, NotificationChannel } from './entities/notification.entity';

// Inject the service
constructor(private notificationService: NotificationService) {}

// Send a notification
await this.notificationService.sendNotification({
  userId: 'user-id',
  type: NotificationType.BOOKING_CONFIRMED,
  data: {
    userName: 'John Doe',
    professionalName: 'Jane Smith',
    serviceCategory: 'Plumbing',
    scheduledDate: '2024-01-15',
    address: '123 Main St',
  },
  channels: [
    NotificationChannel.IN_APP,
    NotificationChannel.EMAIL,
    NotificationChannel.SMS,
  ],
});
```

### Sending Bulk Notifications

```typescript
await this.notificationService.sendBulkNotifications([
  {
    userId: 'user-1',
    type: NotificationType.BOOKING_REMINDER,
    data: { ... },
  },
  {
    userId: 'user-2',
    type: NotificationType.BOOKING_REMINDER,
    data: { ... },
  },
]);
```

### Managing Notification Preferences

```typescript
// Update preferences
await this.notificationService.updateNotificationPreferences(userId, {
  emailNotifications: false,
  smsNotifications: true,
  notificationTypes: {
    [NotificationType.BOOKING_CREATED]: false,
    [NotificationType.BOOKING_CONFIRMED]: true,
    [NotificationType.NEW_MESSAGE]: true,
  },
});

// Get preferences
const preferences = await this.notificationService.getNotificationPreferences(userId);
```

### Notification Type Filtering

When a user disables a specific notification type, the `sendNotification` method will automatically skip sending that notification:

```typescript
// This notification will not be sent if user has disabled BOOKING_CREATED
await this.notificationService.sendNotification({
  userId: 'user-id',
  type: NotificationType.BOOKING_CREATED,
  data: { ... },
});
```

## Configuration

### Environment Variables

```env
# SendGrid (Email)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@technician-marketplace.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Development Mode

If the API keys are not configured or set to placeholder values, the services will run in mock mode and log notifications to the console instead of sending them.

## Template System

Templates are defined in `templates/notification-templates.ts` and support variable substitution using the `{{variableName}}` syntax.

### Adding a New Template

1. Add the notification type to the `NotificationType` enum in `notification.entity.ts`
2. Add the template to `notificationTemplates` in `notification-templates.ts`
3. Provide both Spanish and English versions
4. Include templates for email, SMS, and in-app messages

Example:
```typescript
[NotificationType.NEW_TYPE]: {
  es: {
    subject: 'Asunto del Email',
    title: 'Título de la Notificación',
    message: 'Mensaje con {{variable}}',
    emailTemplate: '<h2>HTML Email</h2><p>{{variable}}</p>',
    smsTemplate: 'SMS corto con {{variable}}',
  },
  en: {
    subject: 'Email Subject',
    title: 'Notification Title',
    message: 'Message with {{variable}}',
    emailTemplate: '<h2>HTML Email</h2><p>{{variable}}</p>',
    smsTemplate: 'Short SMS with {{variable}}',
  },
},
```

## Database Schema

The `notifications` table stores in-app notifications with the following structure:

- `id`: UUID primary key
- `userId`: Foreign key to users table
- `type`: Notification type enum
- `title`: Notification title
- `message`: Notification message
- `data`: JSONB field for additional data
- `isRead`: Boolean flag for read status
- `channels`: Array of channels used
- `createdAt`: Timestamp of creation
- `readAt`: Timestamp when marked as read

Indexes are created on:
- `userId`
- `userId, isRead`
- `userId, createdAt`

## Future Enhancements

1. **Push Notifications**: Implement Firebase Cloud Messaging integration
2. **Notification Scheduling**: Schedule notifications for future delivery
3. **Notification Batching**: Batch multiple notifications into digest emails
4. **Rich Notifications**: Support for images, actions, and interactive elements
5. **Notification Analytics**: Track delivery rates, open rates, and engagement
6. **A/B Testing**: Test different notification templates and timing
7. **Notification Preferences UI**: Allow users to customize notification settings per type

## Testing

The notification system should be tested with:
- Unit tests for template rendering
- Integration tests for notification creation and delivery
- Mock tests for external services (SendGrid, Twilio)
- E2E tests for notification workflows

## Requirements Validation

This module validates the following requirements:
- **Requirement 10.1**: Email and platform notifications for booking creation
- **Requirement 10.2**: Email and platform notifications for booking confirmation
- **Requirement 10.3**: Notifications for booking cancellation
- **Requirement 10.4**: Display unread notification count
- **Requirement 10.5**: Mark notifications as read and navigate to related page
- **Requirement 10.6**: User notification preference management
