import apiClient from './client';
import type {
  CursorResponseContentSummary,
  CursorResponsePlaylistSummary,
} from '@/lib/types';

const DEFAULT_SHELF_LIMIT = 20;

export const getRecommendedContents = async (
  limit = DEFAULT_SHELF_LIMIT,
): Promise<CursorResponseContentSummary> => {
  const response = await apiClient.get<CursorResponseContentSummary>(
    '/api/recommendations/contents',
    { params: { limit } },
  );
  return response.data;
};

export const getRecommendedPlaylists = async (
  limit = DEFAULT_SHELF_LIMIT,
): Promise<CursorResponsePlaylistSummary> => {
  const response = await apiClient.get<CursorResponsePlaylistSummary>(
    '/api/recommendations/playlists',
    { params: { limit } },
  );
  return response.data;
};

export const getTrendingContents = async (): Promise<CursorResponseContentSummary> => {
  const response = await apiClient.get<CursorResponseContentSummary>('/api/trending/contents');
  return response.data;
};

export const getNewContents = async (
  limit = DEFAULT_SHELF_LIMIT,
): Promise<CursorResponseContentSummary> => {
  const response = await apiClient.get<CursorResponseContentSummary>('/api/contents/new', {
    params: { limit },
  });
  return response.data;
};
