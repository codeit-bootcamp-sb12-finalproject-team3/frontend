import type { components } from './api';

type ContentSummary = components['schemas']['ContentSummary'];
type UserSummary = components['schemas']['UserSummary'];

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
  previewContents: ContentSummary[];
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
