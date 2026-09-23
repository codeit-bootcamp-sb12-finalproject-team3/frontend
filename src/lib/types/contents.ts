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

export interface ContentCastCreateRequest {
  name: string;
  roleName?: string;
  profileImageUrl?: string;
}

export interface ContentPlatformCreateRequest {
  platformId: string;
  url: string;
}

export interface SeasonCreateRequest {
  seasonNumber: number;
  title: string;
  description: string;
  thumbnailKey?: string;
  releaseDate?: string;
  episodeCount?: number;
  casts?: ContentCastCreateRequest[];
  genreIds: string[];
  tags?: string[];
  platforms?: ContentPlatformCreateRequest[];
}

interface ContentCreateRequestBase {
  title: string;
  duplicateConfirmed?: boolean;
}

export interface MovieContentCreateRequest extends ContentCreateRequestBase {
  type: 'movie';
  description: string;
  genreIds: string[];
  tags?: string[];
  releaseDate?: string;
  runtime?: number;
  originalTitle?: string;
  casts?: ContentCastCreateRequest[];
  platforms?: ContentPlatformCreateRequest[];
}

export interface TvSeriesContentCreateRequest extends ContentCreateRequestBase {
  type: 'tvSeries';
  seasons: SeasonCreateRequest[];
}

export interface TvSeasonContentCreateRequest extends ContentCreateRequestBase {
  type: 'tvSeason';
  description: string;
  parentContentId: string;
  seasonNumber: number;
  episodeCount?: number;
  releaseDate?: string;
  genreIds: string[];
  tags?: string[];
  casts?: ContentCastCreateRequest[];
  platforms?: ContentPlatformCreateRequest[];
}

export interface SportContentCreateRequest extends ContentCreateRequestBase {
  type: 'sport';
  description: string;
  sportTypeId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt?: string;
  league?: string;
  season?: string;
  round?: string;
  venue?: string;
  country?: string;
  homeScore?: number;
  awayScore?: number;
}

export type ContentCreateRequest =
  | MovieContentCreateRequest
  | TvSeriesContentCreateRequest
  | TvSeasonContentCreateRequest
  | SportContentCreateRequest;

export interface ContentCreateResponse {
  seriesId: string | null;
  contentIds: string[];
  createdAt: string;
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
