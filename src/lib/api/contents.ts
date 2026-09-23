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
  ContentDto,
  ContentCreateRequest,
  ContentGenre,
  ContentSearchParams,
  ContentSportType,
  ContentUpdateRequest,
  CursorResponseContentSummary,
} from '@/lib/types';

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
 * Get contents list with cursor pagination (콘텐츠 목록 조회)
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

/**
 * Get single content (콘텐츠 단건 조회)
 * GET /api/contents/{contentId}
 *
 * @param contentId - Content ID to retrieve
 * @returns Content information
 */
export const getContent = async (contentId: string): Promise<ContentDto> => {
  const response = await apiClient.get<ContentDto>(`/api/contents/${contentId}`);
  return response.data;
};

/**
 * Create content (콘텐츠 생성)
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
  thumbnail: File,
): Promise<ContentCreateResponse> => {

  console.log('CONTENT CREATE REQUEST:', data);
  const formData = new FormData();

  // Append request data as JSON blob
  formData.append(
    'request',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
  );

  // Append thumbnail (required)
  formData.append('thumbnail', thumbnail);

  const response = await apiClient.post<ContentCreateResponse>('/api/contents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Update content (콘텐츠 수정)
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
): Promise<ContentDto> => {
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

  const response = await apiClient.patch<ContentDto>(`/api/contents/${contentId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Delete content (콘텐츠 삭제)
 * DELETE /api/contents/{contentId}
 *
 * @param contentId - Content ID to delete
 *
 * Note: Admin only
 */
export const deleteContent = async (contentId: string): Promise<void> => {
  await apiClient.delete(`/api/contents/${contentId}`);
};
