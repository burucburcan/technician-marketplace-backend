import { NotificationType } from '../../../entities/notification.entity'

export interface NotificationTemplate {
  subject: string
  title: string
  message: string
  emailTemplate?: string
  smsTemplate?: string
}

export type NotificationTemplates = {
  [key in NotificationType]: {
    es: NotificationTemplate
    en: NotificationTemplate
  }
}

export const notificationTemplates: NotificationTemplates = {
  [NotificationType.BOOKING_CREATED]: {
    es: {
      subject: 'Nueva Reservación Recibida',
      title: 'Nueva Reservación',
      message: 'Has recibido una nueva solicitud de reservación de {{userName}}',
      emailTemplate: `
        <h2>Nueva Reservación</h2>
        <p>Hola {{professionalName}},</p>
        <p>Has recibido una nueva solicitud de reservación:</p>
        <ul>
          <li><strong>Cliente:</strong> {{userName}}</li>
          <li><strong>Servicio:</strong> {{serviceCategory}}</li>
          <li><strong>Fecha:</strong> {{scheduledDate}}</li>
          <li><strong>Dirección:</strong> {{address}}</li>
        </ul>
        <p>Por favor, revisa y responde a esta solicitud lo antes posible.</p>
      `,
      smsTemplate:
        'Nueva reservación de {{userName}} para {{serviceCategory}} el {{scheduledDate}}. Revisa tu app.',
    },
    en: {
      subject: 'New Booking Received',
      title: 'New Booking',
      message: 'You have received a new booking request from {{userName}}',
      emailTemplate: `
        <h2>New Booking</h2>
        <p>Hello {{professionalName}},</p>
        <p>You have received a new booking request:</p>
        <ul>
          <li><strong>Client:</strong> {{userName}}</li>
          <li><strong>Service:</strong> {{serviceCategory}}</li>
          <li><strong>Date:</strong> {{scheduledDate}}</li>
          <li><strong>Address:</strong> {{address}}</li>
        </ul>
        <p>Please review and respond to this request as soon as possible.</p>
      `,
      smsTemplate:
        'New booking from {{userName}} for {{serviceCategory}} on {{scheduledDate}}. Check your app.',
    },
  },

  [NotificationType.BOOKING_CONFIRMED]: {
    es: {
      subject: 'Reservación Confirmada',
      title: 'Reservación Confirmada',
      message: 'Tu reservación con {{professionalName}} ha sido confirmada',
      emailTemplate: `
        <h2>Reservación Confirmada</h2>
        <p>Hola {{userName}},</p>
        <p>Tu reservación ha sido confirmada:</p>
        <ul>
          <li><strong>Profesional:</strong> {{professionalName}}</li>
          <li><strong>Servicio:</strong> {{serviceCategory}}</li>
          <li><strong>Fecha:</strong> {{scheduledDate}}</li>
          <li><strong>Dirección:</strong> {{address}}</li>
        </ul>
        <p>El profesional llegará a la hora acordada.</p>
      `,
      smsTemplate:
        'Tu reservación con {{professionalName}} para {{scheduledDate}} ha sido confirmada.',
    },
    en: {
      subject: 'Booking Confirmed',
      title: 'Booking Confirmed',
      message: 'Your booking with {{professionalName}} has been confirmed',
      emailTemplate: `
        <h2>Booking Confirmed</h2>
        <p>Hello {{userName}},</p>
        <p>Your booking has been confirmed:</p>
        <ul>
          <li><strong>Professional:</strong> {{professionalName}}</li>
          <li><strong>Service:</strong> {{serviceCategory}}</li>
          <li><strong>Date:</strong> {{scheduledDate}}</li>
          <li><strong>Address:</strong> {{address}}</li>
        </ul>
        <p>The professional will arrive at the agreed time.</p>
      `,
      smsTemplate:
        'Your booking with {{professionalName}} for {{scheduledDate}} has been confirmed.',
    },
  },

  [NotificationType.BOOKING_REJECTED]: {
    es: {
      subject: 'Reservación Rechazada',
      title: 'Reservación Rechazada',
      message: 'Tu reservación con {{professionalName}} ha sido rechazada',
      emailTemplate: `
        <h2>Reservación Rechazada</h2>
        <p>Hola {{userName}},</p>
        <p>Lamentablemente, tu reservación ha sido rechazada por el profesional.</p>
        <p>Te sugerimos buscar otros profesionales disponibles en tu área.</p>
      `,
      smsTemplate:
        'Tu reservación con {{professionalName}} ha sido rechazada. Busca otros profesionales disponibles.',
    },
    en: {
      subject: 'Booking Rejected',
      title: 'Booking Rejected',
      message: 'Your booking with {{professionalName}} has been rejected',
      emailTemplate: `
        <h2>Booking Rejected</h2>
        <p>Hello {{userName}},</p>
        <p>Unfortunately, your booking has been rejected by the professional.</p>
        <p>We suggest searching for other available professionals in your area.</p>
      `,
      smsTemplate:
        'Your booking with {{professionalName}} has been rejected. Search for other available professionals.',
    },
  },

  [NotificationType.BOOKING_CANCELLED]: {
    es: {
      subject: 'Reservación Cancelada',
      title: 'Reservación Cancelada',
      message: 'La reservación ha sido cancelada',
      emailTemplate: `
        <h2>Reservación Cancelada</h2>
        <p>Hola,</p>
        <p>La reservación para {{serviceCategory}} el {{scheduledDate}} ha sido cancelada.</p>
        <p><strong>Razón:</strong> {{cancellationReason}}</p>
      `,
      smsTemplate: 'Reservación para {{scheduledDate}} cancelada. Razón: {{cancellationReason}}',
    },
    en: {
      subject: 'Booking Cancelled',
      title: 'Booking Cancelled',
      message: 'The booking has been cancelled',
      emailTemplate: `
        <h2>Booking Cancelled</h2>
        <p>Hello,</p>
        <p>The booking for {{serviceCategory}} on {{scheduledDate}} has been cancelled.</p>
        <p><strong>Reason:</strong> {{cancellationReason}}</p>
      `,
      smsTemplate: 'Booking for {{scheduledDate}} cancelled. Reason: {{cancellationReason}}',
    },
  },

  [NotificationType.BOOKING_REMINDER]: {
    es: {
      subject: 'Recordatorio de Reservación',
      title: 'Recordatorio de Reservación',
      message: 'Tu reservación es mañana a las {{scheduledTime}}',
      emailTemplate: `
        <h2>Recordatorio de Reservación</h2>
        <p>Hola {{userName}},</p>
        <p>Este es un recordatorio de tu reservación:</p>
        <ul>
          <li><strong>Profesional:</strong> {{professionalName}}</li>
          <li><strong>Servicio:</strong> {{serviceCategory}}</li>
          <li><strong>Fecha:</strong> {{scheduledDate}}</li>
          <li><strong>Hora:</strong> {{scheduledTime}}</li>
          <li><strong>Dirección:</strong> {{address}}</li>
        </ul>
      `,
      smsTemplate:
        'Recordatorio: Reservación con {{professionalName}} mañana a las {{scheduledTime}}.',
    },
    en: {
      subject: 'Booking Reminder',
      title: 'Booking Reminder',
      message: 'Your booking is tomorrow at {{scheduledTime}}',
      emailTemplate: `
        <h2>Booking Reminder</h2>
        <p>Hello {{userName}},</p>
        <p>This is a reminder of your booking:</p>
        <ul>
          <li><strong>Professional:</strong> {{professionalName}}</li>
          <li><strong>Service:</strong> {{serviceCategory}}</li>
          <li><strong>Date:</strong> {{scheduledDate}}</li>
          <li><strong>Time:</strong> {{scheduledTime}}</li>
          <li><strong>Address:</strong> {{address}}</li>
        </ul>
      `,
      smsTemplate: 'Reminder: Booking with {{professionalName}} tomorrow at {{scheduledTime}}.',
    },
  },

  [NotificationType.BOOKING_STARTED]: {
    es: {
      subject: 'Servicio Iniciado',
      title: 'Servicio Iniciado',
      message: '{{professionalName}} ha iniciado el servicio',
      emailTemplate: `
        <h2>Servicio Iniciado</h2>
        <p>Hola {{userName}},</p>
        <p>{{professionalName}} ha iniciado el servicio de {{serviceCategory}}.</p>
      `,
      smsTemplate: '{{professionalName}} ha iniciado tu servicio de {{serviceCategory}}.',
    },
    en: {
      subject: 'Service Started',
      title: 'Service Started',
      message: '{{professionalName}} has started the service',
      emailTemplate: `
        <h2>Service Started</h2>
        <p>Hello {{userName}},</p>
        <p>{{professionalName}} has started the {{serviceCategory}} service.</p>
      `,
      smsTemplate: '{{professionalName}} has started your {{serviceCategory}} service.',
    },
  },

  [NotificationType.BOOKING_COMPLETED]: {
    es: {
      subject: 'Servicio Completado',
      title: 'Servicio Completado',
      message: 'El servicio ha sido completado. Por favor, deja tu valoración',
      emailTemplate: `
        <h2>Servicio Completado</h2>
        <p>Hola {{userName}},</p>
        <p>El servicio de {{serviceCategory}} con {{professionalName}} ha sido completado.</p>
        <p>Por favor, toma un momento para valorar el servicio recibido.</p>
      `,
      smsTemplate:
        'Servicio completado. Por favor, valora tu experiencia con {{professionalName}}.',
    },
    en: {
      subject: 'Service Completed',
      title: 'Service Completed',
      message: 'The service has been completed. Please leave your rating',
      emailTemplate: `
        <h2>Service Completed</h2>
        <p>Hello {{userName}},</p>
        <p>The {{serviceCategory}} service with {{professionalName}} has been completed.</p>
        <p>Please take a moment to rate the service you received.</p>
      `,
      smsTemplate: 'Service completed. Please rate your experience with {{professionalName}}.',
    },
  },

  [NotificationType.NEW_MESSAGE]: {
    es: {
      subject: 'Nuevo Mensaje',
      title: 'Nuevo Mensaje',
      message: 'Tienes un nuevo mensaje de {{senderName}}',
      emailTemplate: `
        <h2>Nuevo Mensaje</h2>
        <p>Hola,</p>
        <p>Has recibido un nuevo mensaje de {{senderName}}:</p>
        <p><em>{{messagePreview}}</em></p>
        <p>Inicia sesión para ver el mensaje completo.</p>
      `,
      smsTemplate: 'Nuevo mensaje de {{senderName}}. Revisa tu app.',
    },
    en: {
      subject: 'New Message',
      title: 'New Message',
      message: 'You have a new message from {{senderName}}',
      emailTemplate: `
        <h2>New Message</h2>
        <p>Hello,</p>
        <p>You have received a new message from {{senderName}}:</p>
        <p><em>{{messagePreview}}</em></p>
        <p>Log in to view the full message.</p>
      `,
      smsTemplate: 'New message from {{senderName}}. Check your app.',
    },
  },

  [NotificationType.NEW_RATING]: {
    es: {
      subject: 'Nueva Valoración Recibida',
      title: 'Nueva Valoración',
      message: 'Has recibido una nueva valoración de {{userName}}',
      emailTemplate: `
        <h2>Nueva Valoración</h2>
        <p>Hola {{professionalName}},</p>
        <p>{{userName}} ha dejado una valoración de {{rating}} estrellas para tu servicio.</p>
        <p><strong>Comentario:</strong> {{comment}}</p>
      `,
      smsTemplate: 'Nueva valoración de {{rating}} estrellas de {{userName}}.',
    },
    en: {
      subject: 'New Rating Received',
      title: 'New Rating',
      message: 'You have received a new rating from {{userName}}',
      emailTemplate: `
        <h2>New Rating</h2>
        <p>Hello {{professionalName}},</p>
        <p>{{userName}} has left a {{rating}}-star rating for your service.</p>
        <p><strong>Comment:</strong> {{comment}}</p>
      `,
      smsTemplate: 'New {{rating}}-star rating from {{userName}}.',
    },
  },

  [NotificationType.NEW_PRODUCT_REVIEW]: {
    es: {
      subject: 'Nueva Reseña de Producto',
      title: 'Nueva Reseña de Producto',
      message: '{{userName}} ha dejado una reseña para {{productName}}',
      emailTemplate: `
        <h2>Nueva Reseña de Producto</h2>
        <p>Hola,</p>
        <p>{{userName}} ha dejado una reseña de {{rating}} estrellas para tu producto:</p>
        <ul>
          <li><strong>Producto:</strong> {{productName}}</li>
          <li><strong>Calificación:</strong> {{rating}} estrellas</li>
          <li><strong>Comentario:</strong> {{comment}}</li>
        </ul>
        <p>Puedes responder a esta reseña desde tu panel de control.</p>
      `,
      smsTemplate: 'Nueva reseña de {{rating}} estrellas para {{productName}} de {{userName}}.',
    },
    en: {
      subject: 'New Product Review',
      title: 'New Product Review',
      message: '{{userName}} has left a review for {{productName}}',
      emailTemplate: `
        <h2>New Product Review</h2>
        <p>Hello,</p>
        <p>{{userName}} has left a {{rating}}-star review for your product:</p>
        <ul>
          <li><strong>Product:</strong> {{productName}}</li>
          <li><strong>Rating:</strong> {{rating}} stars</li>
          <li><strong>Comment:</strong> {{comment}}</li>
        </ul>
        <p>You can reply to this review from your dashboard.</p>
      `,
      smsTemplate: 'New {{rating}}-star review for {{productName}} from {{userName}}.',
    },
  },

  [NotificationType.NEW_SUPPLIER_REVIEW]: {
    es: {
      subject: 'Nueva Reseña de Proveedor',
      title: 'Nueva Reseña de Proveedor',
      message: '{{userName}} ha dejado una reseña para tu tienda',
      emailTemplate: `
        <h2>Nueva Reseña de Proveedor</h2>
        <p>Hola,</p>
        <p>{{userName}} ha dejado una reseña para tu tienda:</p>
        <ul>
          <li><strong>Calificación General:</strong> {{overallRating}} estrellas</li>
          <li><strong>Calidad del Producto:</strong> {{productQualityRating}} estrellas</li>
          <li><strong>Velocidad de Entrega:</strong> {{deliverySpeedRating}} estrellas</li>
          <li><strong>Comunicación:</strong> {{communicationRating}} estrellas</li>
          <li><strong>Comentario:</strong> {{comment}}</li>
        </ul>
        <p>Sigue brindando un excelente servicio para mantener tu calificación alta.</p>
      `,
      smsTemplate: 'Nueva reseña de {{overallRating}} estrellas para tu tienda de {{userName}}.',
    },
    en: {
      subject: 'New Supplier Review',
      title: 'New Supplier Review',
      message: '{{userName}} has left a review for your store',
      emailTemplate: `
        <h2>New Supplier Review</h2>
        <p>Hello,</p>
        <p>{{userName}} has left a review for your store:</p>
        <ul>
          <li><strong>Overall Rating:</strong> {{overallRating}} stars</li>
          <li><strong>Product Quality:</strong> {{productQualityRating}} stars</li>
          <li><strong>Delivery Speed:</strong> {{deliverySpeedRating}} stars</li>
          <li><strong>Communication:</strong> {{communicationRating}} stars</li>
          <li><strong>Comment:</strong> {{comment}}</li>
        </ul>
        <p>Keep providing excellent service to maintain your high rating.</p>
      `,
      smsTemplate: 'New {{overallRating}}-star review for your store from {{userName}}.',
    },
  },

  [NotificationType.SUPPLIER_REPLY]: {
    es: {
      subject: 'El Proveedor Respondió a tu Reseña',
      title: 'Respuesta del Proveedor',
      message: '{{supplierName}} ha respondido a tu reseña',
      emailTemplate: `
        <h2>Respuesta del Proveedor</h2>
        <p>Hola {{userName}},</p>
        <p>{{supplierName}} ha respondido a tu reseña de {{productName}}:</p>
        <p><strong>Tu reseña:</strong> {{comment}}</p>
        <p><strong>Respuesta del proveedor:</strong> {{reply}}</p>
        <p>Gracias por tu feedback.</p>
      `,
      smsTemplate: '{{supplierName}} respondió a tu reseña de {{productName}}.',
    },
    en: {
      subject: 'Supplier Replied to Your Review',
      title: 'Supplier Reply',
      message: '{{supplierName}} has replied to your review',
      emailTemplate: `
        <h2>Supplier Reply</h2>
        <p>Hello {{userName}},</p>
        <p>{{supplierName}} has replied to your review of {{productName}}:</p>
        <p><strong>Your review:</strong> {{comment}}</p>
        <p><strong>Supplier's reply:</strong> {{reply}}</p>
        <p>Thank you for your feedback.</p>
      `,
      smsTemplate: '{{supplierName}} replied to your review of {{productName}}.',
    },
  },

  [NotificationType.PAYMENT_RECEIVED]: {
    es: {
      subject: 'Pago Recibido',
      title: 'Pago Recibido',
      message: 'Has recibido un pago de {{amount}}',
      emailTemplate: `
        <h2>Pago Recibido</h2>
        <p>Hola {{professionalName}},</p>
        <p>Has recibido un pago de <strong>{{amount}} {{currency}}</strong> por el servicio de {{serviceCategory}}.</p>
        <p>El pago estará disponible en tu cuenta después del período de retención.</p>
      `,
      smsTemplate: 'Pago recibido: {{amount}} {{currency}} por {{serviceCategory}}.',
    },
    en: {
      subject: 'Payment Received',
      title: 'Payment Received',
      message: 'You have received a payment of {{amount}}',
      emailTemplate: `
        <h2>Payment Received</h2>
        <p>Hello {{professionalName}},</p>
        <p>You have received a payment of <strong>{{amount}} {{currency}}</strong> for the {{serviceCategory}} service.</p>
        <p>The payment will be available in your account after the holding period.</p>
      `,
      smsTemplate: 'Payment received: {{amount}} {{currency}} for {{serviceCategory}}.',
    },
  },

  [NotificationType.PAYOUT_PROCESSED]: {
    es: {
      subject: 'Retiro Procesado',
      title: 'Retiro Procesado',
      message: 'Tu retiro de {{amount}} ha sido procesado',
      emailTemplate: `
        <h2>Retiro Procesado</h2>
        <p>Hola {{professionalName}},</p>
        <p>Tu solicitud de retiro de <strong>{{amount}} {{currency}}</strong> ha sido procesada exitosamente.</p>
        <p>Los fondos deberían llegar a tu cuenta en 2-3 días hábiles.</p>
      `,
      smsTemplate: 'Retiro de {{amount}} {{currency}} procesado. Llegará en 2-3 días.',
    },
    en: {
      subject: 'Payout Processed',
      title: 'Payout Processed',
      message: 'Your payout of {{amount}} has been processed',
      emailTemplate: `
        <h2>Payout Processed</h2>
        <p>Hello {{professionalName}},</p>
        <p>Your payout request of <strong>{{amount}} {{currency}}</strong> has been processed successfully.</p>
        <p>The funds should arrive in your account within 2-3 business days.</p>
      `,
      smsTemplate: 'Payout of {{amount}} {{currency}} processed. Will arrive in 2-3 days.',
    },
  },

  [NotificationType.ACCOUNT_VERIFIED]: {
    es: {
      subject: 'Cuenta Verificada',
      title: 'Cuenta Verificada',
      message: 'Tu cuenta ha sido verificada exitosamente',
      emailTemplate: `
        <h2>Cuenta Verificada</h2>
        <p>Hola {{userName}},</p>
        <p>¡Felicitaciones! Tu cuenta ha sido verificada exitosamente.</p>
        <p>Ahora puedes acceder a todas las funciones de la plataforma.</p>
      `,
      smsTemplate: '¡Tu cuenta ha sido verificada! Ya puedes usar todas las funciones.',
    },
    en: {
      subject: 'Account Verified',
      title: 'Account Verified',
      message: 'Your account has been verified successfully',
      emailTemplate: `
        <h2>Account Verified</h2>
        <p>Hello {{userName}},</p>
        <p>Congratulations! Your account has been verified successfully.</p>
        <p>You can now access all platform features.</p>
      `,
      smsTemplate: 'Your account has been verified! You can now use all features.',
    },
  },

  [NotificationType.PROFILE_APPROVED]: {
    es: {
      subject: 'Perfil Aprobado',
      title: 'Perfil Aprobado',
      message: 'Tu perfil profesional ha sido aprobado',
      emailTemplate: `
        <h2>Perfil Aprobado</h2>
        <p>Hola {{professionalName}},</p>
        <p>¡Excelentes noticias! Tu perfil profesional ha sido aprobado.</p>
        <p>Ahora puedes comenzar a recibir solicitudes de reservación.</p>
      `,
      smsTemplate: '¡Tu perfil profesional ha sido aprobado! Ya puedes recibir reservaciones.',
    },
    en: {
      subject: 'Profile Approved',
      title: 'Profile Approved',
      message: 'Your professional profile has been approved',
      emailTemplate: `
        <h2>Profile Approved</h2>
        <p>Hello {{professionalName}},</p>
        <p>Great news! Your professional profile has been approved.</p>
        <p>You can now start receiving booking requests.</p>
      `,
      smsTemplate: 'Your professional profile has been approved! You can now receive bookings.',
    },
  },

  [NotificationType.PROFILE_REJECTED]: {
    es: {
      subject: 'Perfil Rechazado',
      title: 'Perfil Rechazado',
      message: 'Tu perfil profesional necesita correcciones',
      emailTemplate: `
        <h2>Perfil Rechazado</h2>
        <p>Hola {{professionalName}},</p>
        <p>Tu perfil profesional necesita algunas correcciones antes de ser aprobado.</p>
        <p><strong>Razón:</strong> {{rejectionReason}}</p>
        <p>Por favor, actualiza tu perfil y vuelve a enviarlo para revisión.</p>
      `,
      smsTemplate: 'Tu perfil necesita correcciones. Revisa tu email para más detalles.',
    },
    en: {
      subject: 'Profile Rejected',
      title: 'Profile Rejected',
      message: 'Your professional profile needs corrections',
      emailTemplate: `
        <h2>Profile Rejected</h2>
        <p>Hello {{professionalName}},</p>
        <p>Your professional profile needs some corrections before it can be approved.</p>
        <p><strong>Reason:</strong> {{rejectionReason}}</p>
        <p>Please update your profile and resubmit it for review.</p>
      `,
      smsTemplate: 'Your profile needs corrections. Check your email for details.',
    },
  },

  [NotificationType.ORDER_CREATED]: {
    es: {
      subject: 'Nuevo Pedido Recibido',
      title: 'Nuevo Pedido',
      message: 'Has recibido un nuevo pedido #{{orderNumber}}',
      emailTemplate: `
        <h2>Nuevo Pedido</h2>
        <p>Hola,</p>
        <p>Has recibido un nuevo pedido:</p>
        <ul>
          <li><strong>Número de Pedido:</strong> {{orderNumber}}</li>
          <li><strong>Total:</strong> {{total}}</li>
        </ul>
        <p>Por favor, revisa y procesa este pedido lo antes posible.</p>
      `,
      smsTemplate: 'Nuevo pedido #{{orderNumber}}. Revisa tu app.',
    },
    en: {
      subject: 'New Order Received',
      title: 'New Order',
      message: 'You have received a new order #{{orderNumber}}',
      emailTemplate: `
        <h2>New Order</h2>
        <p>Hello,</p>
        <p>You have received a new order:</p>
        <ul>
          <li><strong>Order Number:</strong> {{orderNumber}}</li>
          <li><strong>Total:</strong> {{total}}</li>
        </ul>
        <p>Please review and process this order as soon as possible.</p>
      `,
      smsTemplate: 'New order #{{orderNumber}}. Check your app.',
    },
  },

  [NotificationType.ORDER_CONFIRMED]: {
    es: {
      subject: 'Pedido Confirmado',
      title: 'Pedido Confirmado',
      message: 'Tu pedido #{{orderNumber}} ha sido confirmado',
      emailTemplate: `
        <h2>Pedido Confirmado</h2>
        <p>Hola,</p>
        <p>Tu pedido ha sido confirmado por el proveedor:</p>
        <ul>
          <li><strong>Número de Pedido:</strong> {{orderNumber}}</li>
          <li><strong>Estado:</strong> Confirmado</li>
        </ul>
        <p>Te notificaremos cuando tu pedido sea enviado.</p>
      `,
      smsTemplate: 'Tu pedido #{{orderNumber}} ha sido confirmado.',
    },
    en: {
      subject: 'Order Confirmed',
      title: 'Order Confirmed',
      message: 'Your order #{{orderNumber}} has been confirmed',
      emailTemplate: `
        <h2>Order Confirmed</h2>
        <p>Hello,</p>
        <p>Your order has been confirmed by the supplier:</p>
        <ul>
          <li><strong>Order Number:</strong> {{orderNumber}}</li>
          <li><strong>Status:</strong> Confirmed</li>
        </ul>
        <p>We will notify you when your order is shipped.</p>
      `,
      smsTemplate: 'Your order #{{orderNumber}} has been confirmed.',
    },
  },

  [NotificationType.ORDER_PREPARING]: {
    es: {
      subject: 'Pedido en Preparación',
      title: 'Pedido en Preparación',
      message: 'Tu pedido #{{orderNumber}} está siendo preparado',
      emailTemplate: `
        <h2>Pedido en Preparación</h2>
        <p>Hola,</p>
        <p>Tu pedido está siendo preparado para el envío:</p>
        <ul>
          <li><strong>Número de Pedido:</strong> {{orderNumber}}</li>
          <li><strong>Estado:</strong> En Preparación</li>
        </ul>
        <p>Te notificaremos cuando sea enviado.</p>
      `,
      smsTemplate: 'Tu pedido #{{orderNumber}} está siendo preparado.',
    },
    en: {
      subject: 'Order Being Prepared',
      title: 'Order Being Prepared',
      message: 'Your order #{{orderNumber}} is being prepared',
      emailTemplate: `
        <h2>Order Being Prepared</h2>
        <p>Hello,</p>
        <p>Your order is being prepared for shipment:</p>
        <ul>
          <li><strong>Order Number:</strong> {{orderNumber}}</li>
          <li><strong>Status:</strong> Preparing</li>
        </ul>
        <p>We will notify you when it is shipped.</p>
      `,
      smsTemplate: 'Your order #{{orderNumber}} is being prepared.',
    },
  },

  [NotificationType.ORDER_SHIPPED]: {
    es: {
      subject: 'Pedido Enviado',
      title: 'Pedido Enviado',
      message: 'Tu pedido #{{orderNumber}} ha sido enviado',
      emailTemplate: `
        <h2>Pedido Enviado</h2>
        <p>Hola,</p>
        <p>Tu pedido ha sido enviado:</p>
        <ul>
          <li><strong>Número de Pedido:</strong> {{orderNumber}}</li>
          <li><strong>Número de Seguimiento:</strong> {{trackingNumber}}</li>
          <li><strong>Transportista:</strong> {{carrier}}</li>
        </ul>
        <p>Puedes rastrear tu pedido usando el número de seguimiento.</p>
      `,
      smsTemplate: 'Tu pedido #{{orderNumber}} ha sido enviado. Seguimiento: {{trackingNumber}}',
    },
    en: {
      subject: 'Order Shipped',
      title: 'Order Shipped',
      message: 'Your order #{{orderNumber}} has been shipped',
      emailTemplate: `
        <h2>Order Shipped</h2>
        <p>Hello,</p>
        <p>Your order has been shipped:</p>
        <ul>
          <li><strong>Order Number:</strong> {{orderNumber}}</li>
          <li><strong>Tracking Number:</strong> {{trackingNumber}}</li>
          <li><strong>Carrier:</strong> {{carrier}}</li>
        </ul>
        <p>You can track your order using the tracking number.</p>
      `,
      smsTemplate: 'Your order #{{orderNumber}} has been shipped. Tracking: {{trackingNumber}}',
    },
  },

  [NotificationType.ORDER_DELIVERED]: {
    es: {
      subject: 'Pedido Entregado',
      title: 'Pedido Entregado',
      message: 'Tu pedido #{{orderNumber}} ha sido entregado',
      emailTemplate: `
        <h2>Pedido Entregado</h2>
        <p>Hola,</p>
        <p>Tu pedido ha sido entregado exitosamente:</p>
        <ul>
          <li><strong>Número de Pedido:</strong> {{orderNumber}}</li>
          <li><strong>Estado:</strong> Entregado</li>
        </ul>
        <p>¡Esperamos que disfrutes tu compra! Por favor, considera dejar una reseña.</p>
      `,
      smsTemplate: 'Tu pedido #{{orderNumber}} ha sido entregado.',
    },
    en: {
      subject: 'Order Delivered',
      title: 'Order Delivered',
      message: 'Your order #{{orderNumber}} has been delivered',
      emailTemplate: `
        <h2>Order Delivered</h2>
        <p>Hello,</p>
        <p>Your order has been successfully delivered:</p>
        <ul>
          <li><strong>Order Number:</strong> {{orderNumber}}</li>
          <li><strong>Status:</strong> Delivered</li>
        </ul>
        <p>We hope you enjoy your purchase! Please consider leaving a review.</p>
      `,
      smsTemplate: 'Your order #{{orderNumber}} has been delivered.',
    },
  },

  [NotificationType.ORDER_CANCELLED]: {
    es: {
      subject: 'Pedido Cancelado',
      title: 'Pedido Cancelado',
      message: 'El pedido #{{orderNumber}} ha sido cancelado',
      emailTemplate: `
        <h2>Pedido Cancelado</h2>
        <p>Hola,</p>
        <p>El pedido ha sido cancelado:</p>
        <ul>
          <li><strong>Número de Pedido:</strong> {{orderNumber}}</li>
          <li><strong>Razón:</strong> {{reason}}</li>
        </ul>
        <p>Si tienes alguna pregunta, por favor contáctanos.</p>
      `,
      smsTemplate: 'Pedido #{{orderNumber}} cancelado. Razón: {{reason}}',
    },
    en: {
      subject: 'Order Cancelled',
      title: 'Order Cancelled',
      message: 'Order #{{orderNumber}} has been cancelled',
      emailTemplate: `
        <h2>Order Cancelled</h2>
        <p>Hello,</p>
        <p>The order has been cancelled:</p>
        <ul>
          <li><strong>Order Number:</strong> {{orderNumber}}</li>
          <li><strong>Reason:</strong> {{reason}}</li>
        </ul>
        <p>If you have any questions, please contact us.</p>
      `,
      smsTemplate: 'Order #{{orderNumber}} cancelled. Reason: {{reason}}',
    },
  },
}

export function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match
  })
}
