import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetMessagesQuery, useSendMessageMutation, useSendFileMutation } from '../../store/api/messagingApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface MessagingPanelProps {
  bookingId: string;
}

export const MessagingPanel = ({ bookingId }: MessagingPanelProps) => {
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(i18n.language === 'es' ? 'es-MX' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // For now, we'll use bookingId as conversationId
  // In a real implementation, you'd fetch the conversation first
  const conversationId = bookingId;

  const { data: messages = [], isLoading, refetch } = useGetMessagesQuery({ conversationId });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [sendFile, { isLoading: isUploadingFile }] = useSendFileMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;

    try {
      if (selectedFile) {
        await sendFile({ conversationId, file: selectedFile }).unwrap();
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      
      if (message.trim()) {
        await sendMessage({
          conversationId,
          content: message.trim(),
        }).unwrap();
        setMessage('');
      }
      
      refetch();
    } catch (error) {
      alert(t('booking.error.messageFailed'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden" data-testid="messaging-panel">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('booking.detail.messages')}
        </h2>
      </div>

      {/* Messages List */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>{t('booking.detail.noMessages')}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    {!isOwnMessage && (
                      <div className="flex items-center mb-1">
                        {msg.senderAvatar && (
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-6 h-6 rounded-full mr-2"
                          />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {msg.senderName}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.type === 'image' || msg.type === 'file' ? (
                        <div>
                          {msg.type === 'image' && msg.fileUrl && (
                            <img
                              src={msg.fileUrl}
                              alt="Attachment"
                              className="max-w-full rounded mb-2"
                            />
                          )}
                          {msg.type === 'file' && msg.fileUrl && (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm underline"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {msg.content || 'File'}
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-right text-gray-500' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        {selectedFile && (
          <div className="mb-2 flex items-center justify-between bg-gray-50 p-2 rounded">
            <span className="text-sm text-gray-700">{selectedFile.name}</span>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700"
            title={t('booking.detail.attachFile')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('booking.detail.typeMessage')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={1}
            data-testid="message-input"
          />
          <button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !selectedFile) || isSending || isUploadingFile}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="send-message-button"
          >
            {isSending || isUploadingFile ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
