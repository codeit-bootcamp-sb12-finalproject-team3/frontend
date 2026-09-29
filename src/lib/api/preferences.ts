import { isAxiosError } from 'axios';
import apiClient from './client';
import { getContents } from './contents';
import { getTrendingContents } from './recommendations';
import type { ContentSummaryResponse } from '@/lib/types';

interface UserPreferenceResponse {
  contentIds: string[];
}

interface PreferenceErrorResponse {
  code?: string;
}

const CANDIDATE_LIMIT_PER_TYPE = 50;
const TOTAL_CANDIDATE_LIMIT = 100;

export const getMyPreferences = async (): Promise<UserPreferenceResponse> => {
  const response = await apiClient.get<UserPreferenceResponse>('/api/users/me/preferences');
  return response.data;
};

export const createMyPreferences = async (
  contentIds: string[],
): Promise<UserPreferenceResponse> => {
  const response = await apiClient.post<UserPreferenceResponse>('/api/users/me/preferences', {
    contentIds,
  });
  return response.data;
};

export const isPreferenceNotFoundError = (error: unknown): boolean => {
  if (!isAxiosError<PreferenceErrorResponse>(error)) return false;
  return error.response?.status === 404
    && (!error.response.data.code || error.response.data.code === 'PREFERENCE_NOT_FOUND');
};

const isSelectable = (content: ContentSummaryResponse) =>
  content.type === 'movie' || content.type === 'tvSeason';

export const getPreferenceCandidates = async (): Promise<ContentSummaryResponse[]> => {
  const [trendingResult, movieResult, tvSeasonResult] = await Promise.allSettled([
    getTrendingContents(),
    getContents({ typeEqual: 'movie', sortBy: 'rating', limit: CANDIDATE_LIMIT_PER_TYPE }),
    getContents({ typeEqual: 'tvSeries', sortBy: 'rating', limit: CANDIDATE_LIMIT_PER_TYPE }),
  ]);

  const trending = trendingResult.status === 'fulfilled'
    ? trendingResult.value.data.filter(isSelectable)
    : [];
  const movies = movieResult.status === 'fulfilled' ? movieResult.value.data : [];
  const tvSeasons = tvSeasonResult.status === 'fulfilled' ? tvSeasonResult.value.data : [];

  if (trending.length === 0 && movies.length === 0 && tvSeasons.length === 0) {
    throw new Error('No preference candidates could be loaded.');
  }

  const candidates: ContentSummaryResponse[] = [];
  const addedIds = new Set<string>();
  const append = (content?: ContentSummaryResponse) => {
    if (!content || !isSelectable(content) || addedIds.has(content.id)) return;
    addedIds.add(content.id);
    candidates.push(content);
  };

  trending.forEach(append);

  const stableCandidateCount = Math.max(movies.length, tvSeasons.length);
  for (let index = 0; index < stableCandidateCount; index += 1) {
    append(movies[index]);
    append(tvSeasons[index]);
  }

  return candidates.slice(0, TOTAL_CANDIDATE_LIMIT);
};
