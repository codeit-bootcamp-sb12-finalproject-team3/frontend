import { useEffect, useRef, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import { useWebSocketStore } from '@/lib/stores/websocketStore';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import useDirectMessageStore from '@/lib/stores/useDirectMessageStore';
import ConversationList from './components/ConversationList';
import MessageThread from './components/MessageThread';
import EmptyState from './components/EmptyState';
import type { DirectMessageDto, DmMessageCreatedPayload } from '@/lib/types';
import {getConversationById, markDirectMessageAsRead} from "@/lib/api";
import useConversationStore from "@/lib/stores/useConversationStore.ts";

export default function ConversationsPage() {
  const navigate = useNavigate();
  const { conversationId: selectedConversationId  } = useParams<{ conversationId: string }>();
  const [isConnecting, setIsConnecting] = useState(false);
  const selectedConversationIdRef = useRef(selectedConversationId);

  // Stores
  const { connect, subscribe, unsubscribe, isConnected, send } = useWebSocketStore();
  const { data: authentication } = useAuthStore();

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!isConnected || !selectedConversationId) return;

    send('/pub/dm/conversations/activate', {
      conversationId: selectedConversationId,
    });

    return () => {
      send('/pub/dm/conversations/deactivate', {
        conversationId: selectedConversationId,
      });
    };
  }, [isConnected, selectedConversationId, send]);

  // WebSocket connection and subscription
  useEffect(() => {
    if (!authentication) return;

    const accessToken = authentication.accessToken;

    const setupWebSocket = async () => {
      setIsConnecting(true);

      try {
        // Connect if not already connected
        if (!isConnected) {
          await connect(accessToken);
        }

        subscribe('/user/queue/dm', async (payload: DmMessageCreatedPayload) => {
          const message: DirectMessageDto = {
            id: payload.messageId,
            conversationId: payload.conversationId,
            senderId: payload.senderId,
            content: payload.content,
            createdAt: payload.createdAt,
            readAt: null,
          };
          const currentConversationId = selectedConversationIdRef.current;
          const isCurrentConversation = currentConversationId === payload.conversationId;

          if (isCurrentConversation) {
            useDirectMessageStore.getState().add(message);
            void markDirectMessageAsRead(payload.conversationId, payload.messageId);
          }

          const conversationStore = useConversationStore.getState();
          const existingConversation = conversationStore.data.find(
            (conversation) => conversation.id === payload.conversationId,
          );

          if (existingConversation) {
            conversationStore.update(payload.conversationId, {
              latestMessage: message,
              hasUnread: !isCurrentConversation,
            });
          } else {
            try {
              const conversation = await getConversationById(payload.conversationId);
              useConversationStore.getState().add({
                ...conversation,
                latestMessage: message,
                hasUnread: !isCurrentConversation,
              });
            } catch (error) {
              console.error('Failed to fetch conversation:', error);
            }
          }
        });
      } catch (error) {
        console.error('WebSocket setup failed:', error);
      } finally {
        setIsConnecting(false);
      }
    };

    setupWebSocket();

    // Keep one user-queue subscription for the lifetime of this connection.
    return () => {
      unsubscribe('/user/queue/dm');
    };
  }, [authentication, isConnected, connect, subscribe, unsubscribe]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    navigate(`/conversations/${conversationId}`);
  };

  // Handle sending message
  const handleSendMessage = (content: string) => {
    if (!selectedConversationId) return;

    try {
      send('/pub/dm/messages', {
        conversationId: selectedConversationId,
        content,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-80px)] bg-background">
      {/* Left Panel: Conversation List */}
      <div className="w-[400px] border-r border-gray-800 flex flex-col">
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Right Panel: Message Thread or Empty State */}
      <div className="flex-1">
        {selectedConversationId ? (
          <MessageThread
            conversationId={selectedConversationId}
            onSendMessage={handleSendMessage}
            isConnected={isConnected && !isConnecting}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
