import apiClient from './client';
import type {
  CreateWatchPartyRequest,
  CursorPageWatchPartyResponse,
  WatchPartyResponse,
  WatchPartySearchParams,
} from '@/lib/types';

export const getWatchParties = async (
  params: WatchPartySearchParams,
): Promise<CursorPageWatchPartyResponse> => {
  const response = await apiClient.get<CursorPageWatchPartyResponse>('/api/watch-parties', {
    params,
  });
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

export const startWatchParty = async (partyId: string): Promise<void> => {
  await apiClient.patch(`/api/watch-parties/${partyId}/start`);
};

export const endWatchParty = async (partyId: string): Promise<void> => {
  await apiClient.patch(`/api/watch-parties/${partyId}/end`);
};
