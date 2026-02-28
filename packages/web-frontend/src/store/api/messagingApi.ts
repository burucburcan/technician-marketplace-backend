import { api } from '../api';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  bookingId: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: Record<string, number>;
  isActive: boolean;
  createdAt: Date;
}

export interface SendMessageDTO {
  conversationId: string;
  content: string;
  type?: MessageType;
}

export const messagingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConversation: builder.query<Conversation, string>({
      query: (conversationId) => `/messaging/conversations/${conversationId}`,
    }),
    
    getMessages: builder.query<Message[], { conversationId: string; page?: number; limit?: number }>({
      query: ({ conversationId, page = 1, limit = 50 }) => ({
        url: `/messaging/conversations/${conversationId}/messages`,
        params: { page, limit },
      }),
    }),
    
    sendMessage: builder.mutation<Message, SendMessageDTO>({
      query: (data) => ({
        url: '/messaging/messages',
        method: 'POST',
        body: data,
      }),
    }),
    
    sendFile: builder.mutation<Message, { conversationId: string; file: File }>({
      query: ({ conversationId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', conversationId);
        return {
          url: '/messaging/messages/file',
          method: 'POST',
          body: formData,
        };
      },
    }),
    
    markAsRead: builder.mutation<void, string>({
      query: (messageId) => ({
        url: `/messaging/messages/${messageId}/read`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetConversationQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useSendFileMutation,
  useMarkAsReadMutation,
} = messagingApi;
