/**
 * Contents API Module
 *
 * Handles content management operations:
 * - Content listing with search and filtering
 * - Content CRUD operations (admin only)
 * - Tags and metadata management
 */

import apiClient from './client';
import type {
  ContentCreateResponse,
  ContentResponse,
  ContentLikeResponse,
  ContentPlatformResponse,
  ContentPlatformCatalogItem,
  ContentPlaylistResponse,
  ContentWatchPartyResponse,
  ContentCreateRequest,
  ContentGenre,
  ContentSearchParams,
  ContentAutocompleteResponse,
  ContentSportType,
  ContentSeriesSearchResponse,
  ContentUpdateRequest,
  CursorResponseContentSummary,
  EpisodeResponse,
  EpisodeCreateRequest,
  EpisodeUpdateRequest,
} from '@/lib/types';

export const getContentAutocomplete = async (
  query: string,
  signal?: AbortSignal,
): Promise<ContentAutocompleteResponse> => {
  const response = await apiClient.get<ContentAutocompleteResponse>('/api/search/contents/autocomplete', {
    params: { query: query.trim() },
    signal,
  });
  return response.data;
};

const CONTENT_TYPE_QUERY_VALUES = {
  movie: 'MOVIE',
  tvSeries: 'TV_SERIES',
  sport: 'SPORT',
} as const;

const CONTENT_SORT_QUERY_VALUES = {
  latest: 'LATEST',
  rating: 'RATING',
} as const;

const toContentQueryParams = (params: ContentSearchParams) => ({
  ...params,
  typeEqual: params.typeEqual ? CONTENT_TYPE_QUERY_VALUES[params.typeEqual] : undefined,
  sortBy: params.sortBy ? CONTENT_SORT_QUERY_VALUES[params.sortBy] : undefined,
});

/**
 * Get contents list with cursor pagination
 * GET /api/contents
 *
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Paginated list of contents
 */
export const getContents = async (
  params: ContentSearchParams,
): Promise<CursorResponseContentSummary> => {
  const response = await apiClient.get<CursorResponseContentSummary>('/api/contents', {
    params: toContentQueryParams(params),
  });
  return response.data;
};

export const getContentGenres = async (
  type: 'movie' | 'tvSeries',
): Promise<ContentGenre[]> => {
  const response = await apiClient.get<ContentGenre[]>('/api/contents/genres', {
    params: { type: CONTENT_TYPE_QUERY_VALUES[type] },
  });
  return response.data;
};

export const getContentSportTypes = async (): Promise<ContentSportType[]> => {
  const response = await apiClient.get<ContentSportType[]>('/api/contents/sport-types');
  return response.data;
};

export const searchContentSeriesForAdmin = async (query: string, signal?: AbortSignal): Promise<ContentSeriesSearchResponse> => {
  const response = await apiClient.get<ContentSeriesSearchResponse>('/api/admin/content-series', {
    params: { query: query.trim() },
    signal,
  });
  return response.data;
};

/**
 * Get single content
 * GET /api/contents/{contentId}
 *
 * @param contentId - Content ID to retrieve
 * @returns Content information
 */
export const getContent = async (contentId: string): Promise<ContentResponse> => {
  const response = await apiClient.get<ContentResponse>(`/api/contents/${contentId}`);
  return response.data;
};

export const getContentEpisodes = async (seasonId: string): Promise<EpisodeResponse[]> => {
  const response = await apiClient.get<EpisodeResponse[]>(`/api/contents/${seasonId}/episodes`);
  return response.data;
};

export const getContentEpisode = async (seasonId: string, episodeId: string): Promise<EpisodeResponse> => {
  const response = await apiClient.get<EpisodeResponse>(`/api/contents/${seasonId}/episodes/${episodeId}`);
  return response.data;
};

export const createContentEpisode = async (
  seasonId: string,
  data: EpisodeCreateRequest,
  thumbnail?: File,
): Promise<EpisodeResponse> => {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  if (thumbnail) formData.append('thumbnail', thumbnail);
  const response = await apiClient.post<EpisodeResponse>(
    `/api/contents/${seasonId}/episodes`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

export const updateContentEpisode = async (
  seasonId: string,
  episodeId: string,
  data: EpisodeUpdateRequest,
  thumbnail?: File,
): Promise<EpisodeResponse> => {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  if (thumbnail) formData.append('thumbnail', thumbnail);
  const response = await apiClient.patch<EpisodeResponse>(
    `/api/contents/${seasonId}/episodes/${episodeId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

export const deleteContentEpisode = async (seasonId: string, episodeId: string): Promise<void> => {
  await apiClient.delete(`/api/contents/${seasonId}/episodes/${episodeId}`);
};

export const getContentLike = async (contentId: string): Promise<ContentLikeResponse> => {
  const response = await apiClient.get<ContentLikeResponse>(`/api/contents/${contentId}/likes`);
  return response.data;
};

export const likeContent = async (contentId: string): Promise<ContentLikeResponse> => {
  const response = await apiClient.put<ContentLikeResponse>(`/api/contents/${contentId}/likes`);
  return response.data;
};

export const unlikeContent = async (contentId: string): Promise<ContentLikeResponse> => {
  const response = await apiClient.delete<ContentLikeResponse>(`/api/contents/${contentId}/likes`);
  return response.data;
};

export const getContentPlatforms = async (contentId: string): Promise<ContentPlatformResponse> => {
  const response = await apiClient.get<ContentPlatformResponse>(`/api/contents/${contentId}/ott`);
  return response.data;
};

export const getContentPlatformCatalog = async (): Promise<ContentPlatformCatalogItem[]> => {
  const response = await apiClient.get<ContentPlatformCatalogItem[]>('/api/contents/platforms');
  return response.data;
};

export const getContentPlaylists = async (contentId: string): Promise<ContentPlaylistResponse> => {
  const response = await apiClient.get<ContentPlaylistResponse>(`/api/contents/${contentId}/playlists`);
  return response.data;
};

export const getContentWatchParties = async (contentId: string): Promise<ContentWatchPartyResponse> => {
  const response = await apiClient.get<ContentWatchPartyResponse>(`/api/contents/${contentId}/watch-parties`);
  return response.data;
};

/**
 * Create content
 * POST /api/contents
 *
 * @param data - Content data
 * @param thumbnail - Thumbnail image file (required)
 * @returns Created content information
 *
 * Note: Admin only
 */
export const createContent = async (
  data: ContentCreateRequest,
  thumbnail?: File,
  namedThumbnails?: Record<string, File>,
): Promise<ContentCreateResponse> => {

  console.log('CONTENT CREATE REQUEST:', data);
  const formData = new FormData();

  // Append request data as JSON blob
  formData.append(
    'request',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
  );

  if (thumbnail) formData.append('thumbnail', thumbnail);
  Object.entries(namedThumbnails ?? {}).forEach(([name, file]) => formData.append(name, file));

  const response = await apiClient.post<ContentCreateResponse>('/api/contents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Update content
 * PATCH /api/contents/{contentId}
 *
 * @param contentId - Content ID to update
 * @param data - Content data to update
 * @param thumbnail - Optional new thumbnail image
 * @returns Updated content information
 *
 * Note: Admin only
 */
export const updateContent = async (
  contentId: string,
  data: ContentUpdateRequest,
  thumbnail?: File,
): Promise<ContentResponse> => {
  const formData = new FormData();

  // Append request data as JSON blob
  formData.append(
    'request',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
  );

  // Append thumbnail if provided
  if (thumbnail) {
    formData.append('thumbnail', thumbnail);
  }

  const response = await apiClient.patch<ContentResponse>(`/api/contents/${contentId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const restoreContentSeason = async (hiddenSeasonId: string): Promise<ContentResponse> => {
  const response = await apiClient.patch<ContentResponse>(
    `/api/admin/content-seasons/${hiddenSeasonId}/restore`,
  );
  return response.data;
};

/**
 * Delete content
 * DELETE /api/contents/{contentId}
 *
 * @param contentId - Content ID to delete
 *
 * Note: Admin only
 */
export const deleteContent = async (contentId: string): Promise<void> => {
  await apiClient.delete(`/api/contents/${contentId}`);
};
