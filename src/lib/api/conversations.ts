/**
 * Conversations & Direct Messages API Module
 *
 * Handles conversation and direct message operations:
 * - Conversation management
 * - Direct message listing
 * - Message read status
 */

import apiClient from './client';
import type {
  ConversationResponseDto,
  ConversationCreateRequest,
  CursorResponseConversationListResponse,
  CursorResponseDirectMessageDto,
  FindConversationsParams,
  FindDmsParams,
} from '@/lib/types';

/**
 * Get conversations list with cursor pagination (대화 목록 조회)
 * GET /api/conversations
 *
 * @param params - Query parameters for sorting and pagination
 * @returns Paginated list of conversations
 *
 * Note: Only returns requester's conversations
 */
export const getConversations = async (
  params?: FindConversationsParams,
): Promise<CursorResponseConversationListResponse> => {
  const response = await apiClient.get<CursorResponseConversationListResponse>('/api/conversations', {
    params,
  });
  return response.data;
};

/**
 * Create conversation (대화 생성)
 * POST /api/conversations
 *
 * @param data - Conversation creation data (peerId)
 * @param signal - Optional signal for cancelling the request
 * @returns Created conversation information
 */
export const createConversation = async (
  data: ConversationCreateRequest,
  signal?: AbortSignal,
): Promise<ConversationResponseDto> => {
  const response = await apiClient.post<ConversationResponseDto>('/api/conversations', data, {
    signal,
  });
  return response.data;
};

/**
 * Get direct messages in a conversation (DM 목록 조회)
 * GET /api/conversations/{conversationId}/direct-messages
 *
 * @param conversationId - Conversation ID
 * @param params - Query parameters for sorting and pagination
 * @returns Paginated list of direct messages
 *
 * Note: Requester must be a participant in the conversation
 */
export const getDirectMessages = async (
  conversationId: string,
  params?: FindDmsParams,
): Promise<CursorResponseDirectMessageDto> => {
  const response = await apiClient.get<CursorResponseDirectMessageDto>(
    `/api/conversations/${conversationId}/direct-messages`,
    { params },
  );
  return response.data;
};

/**
 * Mark direct message as read (DM 읽음 처리)
 * POST /api/conversations/{conversationId}/read
 *
 * @param conversationId - Conversation ID
 * @param lastReadMessageId - Last direct message ID read by the requester
 */
export const markDirectMessageAsRead = async (
  conversationId: string,
  lastReadMessageId: string,
): Promise<void> => {
  await apiClient.post(`/api/conversations/${conversationId}/read`, {
    lastReadMessageId,
  });
};

/**
 * Get conversations with id (대화 조회)
 * GET /api/conversations/{conversationId}
 *
 * @param conversationId - Query parameters for specific conversation ID
 * @returns ConversationDto or 404 error if not found
 *
 * Note: Only returns requester's conversations
 */
export const getConversationById = async (
    conversationId: string,
): Promise<ConversationResponseDto> => {
  const response = await apiClient.get<ConversationResponseDto>(`/api/conversations/${conversationId}`);
  return response.data;
};
