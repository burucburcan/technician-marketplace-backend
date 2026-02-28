import { Schema, Document } from 'mongoose'

export interface ActivityLog extends Document {
  userId: string
  action: string
  resource: string
  resourceId: string
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
}

export const ActivityLogSchema = new Schema<ActivityLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'activity_logs',
  }
)

// Indexes for performance and querying
ActivityLogSchema.index({ userId: 1, timestamp: -1 })
ActivityLogSchema.index({ resource: 1, resourceId: 1 })
ActivityLogSchema.index({ action: 1, timestamp: -1 })
ActivityLogSchema.index({ timestamp: -1 })
