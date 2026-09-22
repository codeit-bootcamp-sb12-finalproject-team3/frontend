export type ContentSummaryType = 'movie' | 'tvSeason' | 'sport';
export type ContentTypeFilter = 'movie' | 'tvSeries' | 'sport';
export type ContentSort = 'latest' | 'rating';

export interface ContentGenre {
  id: string;
  name: string;
}

export interface ContentTag {
  id: string;
  name: string;
}

export interface ContentSportType {
  id: string;
  code: string;
  name: string;
}

export interface ContentSummaryResponse {
  id: string;
  parentContentId: string | null;
  title: string;
  description: string | null;
  type: ContentSummaryType;
  seasonNumber: number | null;
  episodeCount: number | null;
  sportType: string | null;
  league: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  thumbnailUrl: string | null;
  releaseDate: string | null;
  runtime: number | null;
  averageRating: number;
  reviewCount: number;
  likeCount: number;
  likedByMe: boolean;
  genres: ContentGenre[];
  tags: ContentTag[];
}

export interface ContentSearchParams {
  keywordLike?: string;
  typeEqual?: ContentTypeFilter;
  genreIdEqual?: string;
  sportTypeEqual?: string;
  likedByMe?: boolean;
  sortBy?: ContentSort;
  cursor?: string;
  idAfter?: string;
  limit: number;
}

export interface CursorResponseContentSummary {
  data: ContentSummaryResponse[];
  nextCursor: string | null;
  nextIdAfter: string | null;
  hasNext: boolean;
  totalCount: number;
  sortBy: ContentSort | 'likedAt';
  sortDirection: 'DESCENDING';
}
