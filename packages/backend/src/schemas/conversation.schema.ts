import { Schema, Document } from 'mongoose'

export interface Message {
  id: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  fileUrl?: string
  isRead: boolean
  createdAt: Date
}

export interface Conversation extends Document {
  bookingId: string
  participants: string[]
  messages: Message[]
  lastMessage?: Message
  unreadCount: Map<string, number>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const ConversationSchema = new Schema<Conversation>(
  {
    bookingId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    participants: {
      type: [String],
      required: true,
      index: true,
    },
    messages: [
      {
        id: {
          type: String,
          required: true,
        },
        senderId: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['text', 'image', 'file', 'system'],
          default: 'text',
        },
        fileUrl: {
          type: String,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastMessage: {
      type: Object,
      default: null,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
)

// Indexes for performance
ConversationSchema.index({ bookingId: 1 })
ConversationSchema.index({ participants: 1 })
ConversationSchema.index({ 'messages.createdAt': -1 })
