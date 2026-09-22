import type { components } from './api';

type UserSummary = components['schemas']['UserSummary'];

export type PlaylistContentType = 'movie' | 'tvSeason';

export interface PlaylistContentSummary {
  id: string;
  type: PlaylistContentType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  averageRating: number;
  reviewCount: number;
}

export interface PlaylistDetail {
  id: string;
  owner: UserSummary;
  title: string;
  description: string;
  updatedAt: string;
  subscriberCount: number;
  subscribedByMe: boolean;
  contents: PlaylistContentSummary[];
}

export interface PlaylistCreateRequest {
  title: string;
  description: string;
  contentIds: string[];
}

export type PlaylistSortBy = 'createdAt' | 'weeklyPopularityScore';

export interface PlaylistSearchParams {
  ownerIdEqual?: string;
  subscriberIdEqual?: string;
  contentIdEqual?: string;
  cursor?: string;
  idAfter?: string;
  limit: number;
  sortBy: PlaylistSortBy;
  sortDirection: 'ASCENDING' | 'DESCENDING';
}

export interface PlaylistSummary {
  id: string;
  owner: UserSummary;
  title: string;
  description: string;
  createdAt: string;
  subscriberCount: number;
  subscribedByMe: boolean;
  contentCount: number;
  previewContents: PlaylistContentSummary[];
}

export interface CursorResponsePlaylistSummary {
  data: PlaylistSummary[];
  nextCursor: string | null;
  nextIdAfter: string | null;
  hasNext: boolean;
  totalCount: number;
  sortBy: PlaylistSortBy;
  sortDirection: 'ASCENDING' | 'DESCENDING';
}
