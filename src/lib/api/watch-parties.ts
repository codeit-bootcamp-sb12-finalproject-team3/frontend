import apiClient from './client';
import type {
  CreateWatchPartyRequest,
  CursorPageWatchPartyResponse,
  WatchPartyResponse,
  WatchPartyChatHistoryMessage,
  WatchPartyParticipantResponse,
  WatchPartySearchParams,
  WatchPartySummaryResponse,
} from '@/lib/types';
import { isAxiosError } from 'axios';

export const getWatchParties = async (
  params: WatchPartySearchParams,
): Promise<CursorPageWatchPartyResponse> => {
  const response = await apiClient.get<CursorPageWatchPartyResponse>('/api/watch-parties', {
    params,
  });
  return response.data;
};

/** GET /api/watch-parties/scheduled-by-me: 내 시작 알림 예약 목록 */
export const getScheduledWatchPartiesByMe = async (): Promise<WatchPartySummaryResponse[]> => {
  const response = await apiClient.get<WatchPartySummaryResponse[]>('/api/watch-parties/scheduled-by-me');
  return response.data;
};

export const getWatchParty = async (partyId: string): Promise<WatchPartyResponse> => {
  const response = await apiClient.get<WatchPartyResponse>(`/api/watch-parties/${partyId}`);
  return response.data;
};

export const createWatchParty = async (
  request: CreateWatchPartyRequest,
): Promise<WatchPartyResponse> => {
  const response = await apiClient.post<WatchPartyResponse>('/api/watch-parties', request);
  return response.data;
};

export const joinWatchParty = async (partyId: string): Promise<void> => {
  await apiClient.post(`/api/watch-parties/${partyId}/participants`);
};

export const leaveWatchParty = async (partyId: string): Promise<void> => {
  await apiClient.delete(`/api/watch-parties/${partyId}/participants/me`);
};

export const getWatchPartyChatMessages = async (
  partyId: string,
  limit = 50,
): Promise<WatchPartyChatHistoryMessage[]> => {
  const response = await apiClient.get<WatchPartyChatHistoryMessage[]>(
    `/api/watch-parties/${partyId}/chat-messages`,
    { params: { limit } },
  );
  return response.data;
};

export const getWatchPartyParticipants = async (
  partyId: string,
): Promise<WatchPartyParticipantResponse[]> => {
  const response = await apiClient.get<WatchPartyParticipantResponse[]>(
    `/api/watch-parties/${partyId}/participants`,
  );
  return response.data;
};

export const getServerTime = async (): Promise<number> => {
  const response = await apiClient.get<{ serverTime: number }>('/api/watch-parties/server-time');
  return response.data.serverTime;
};

export const kickWatchPartyParticipant = async (
  partyId: string,
  userId: string,
): Promise<void> => {
  await apiClient.delete(`/api/watch-parties/${partyId}/participants/${userId}`);
};

export const setWatchPartyReminder = async (partyId: string): Promise<void> => {
  await apiClient.post(`/api/watch-parties/${partyId}/reminders`);
};

export const cancelWatchPartyReminder = async (partyId: string): Promise<void> => {
  await apiClient.delete(`/api/watch-parties/${partyId}/reminders`);
};

export const startWatchParty = async (partyId: string): Promise<void> => {
  await apiClient.patch(`/api/watch-parties/${partyId}/start`);
};

export const endWatchParty = async (partyId: string): Promise<void> => {
  await apiClient.patch(`/api/watch-parties/${partyId}/end`);
};

interface WatchPartyApiErrorResponse {
  code?: string;
  details?: { opensAt?: string };
}

/** 참가 실패 시 보여줄 문구. 대기실 오픈 전이면 입장 가능 시각을 알려준다 */
export const getWatchPartyJoinErrorMessage = (error: unknown): string => {
  if (isAxiosError<WatchPartyApiErrorResponse>(error)) {
    const data = error.response?.data;
    if (data?.code === 'WATCHPARTY_LOBBY_NOT_OPEN' && data.details?.opensAt) {
      const opensAt = new Date(data.details.opensAt).toLocaleString('ko-KR', {
        month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      return `${opensAt}부터 입장할 수 있어요.`;
    }
  }
  return 'Watch Party에 참여하지 못했습니다. 참여 상태와 정원을 확인해주세요.';
};