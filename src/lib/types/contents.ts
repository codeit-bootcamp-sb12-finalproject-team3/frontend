export type SelectableContentType = 'movie' | 'tvSeason';
export type SelectableContentTypeFilter = 'movie' | 'tvSeries';

export interface SelectableContent {
  id: string;
  title: string;
  description: string | null;
  type: SelectableContentType;
  seasonNumber: number | null;
  thumbnailUrl: string | null;
}

export interface SelectableContentSearchParams {
  keywordLike?: string;
  typeEqual: SelectableContentTypeFilter;
  cursor?: string;
  idAfter?: string;
  limit: number;
  sortBy: 'latest' | 'rating';
}

export interface CursorResponseSelectableContent {
  data: SelectableContent[];
  nextCursor: string | null;
  nextIdAfter: string | null;
  hasNext: boolean;
  totalCount: number;
  sortBy: 'latest' | 'rating';
  sortDirection: 'DESCENDING';
}
