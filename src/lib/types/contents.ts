export type ContentSummaryType = 'movie' | 'tvSeason' | 'sport';
export type ContentTypeFilter = 'movie' | 'tvSeries' | 'sport';
export type ContentSort = 'latest' | 'rating';

export interface ContentSearchSuggestion {
  text: string;
  type: string;
}

export interface ContentAutocompleteResponse {
  suggestions: ContentSearchSuggestion[];
}

export interface ContentGenre {
  id: string;
  name: string;
}

export interface ContentTag {
  id: string;
  name: string;
}

export interface ContentCast {
  name: string;
  roleName: string | null;
  profileImageUrl: string | null;
}

export interface ContentMovieDetail {
  runtime: number | null;
}

export interface ContentTvSeasonDetail {
  parentContentId: string;
  seriesTitle: string;
  seasonNumber: number | null;
  episodeCount: number | null;
  registeredEpisodeCount: number;
}

export interface ContentSportDetail {
  sportType: ContentSportType;
  scheduledAt: string | null;
  league: string | null;
  season: string | null;
  round: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  venue: string | null;
  country: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ContentResponse {
  id: string;
  type: ContentSummaryType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  releaseDate: string | null;
  averageRating: number;
  reviewCount: number;
  likeCount: number;
  originalTitle: string | null;
  englishTitle: string | null;
  genres: ContentGenre[];
  tags: ContentTag[];
  cast: ContentCast[];
  movie: ContentMovieDetail | null;
  tvSeason: ContentTvSeasonDetail | null;
  sport: ContentSportDetail | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentLikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface ContentPlatformItem {
  platformId: string;
  name: string;
  logoUrl: string | null;
  url: string;
}

export interface ContentPlatformResponse {
  regionCode: string;
  justWatchAttributionRequired: boolean;
  otts: ContentPlatformItem[];
}

export interface ContentPlaylistResponse {
  data: import('./playlists').PlaylistSummary[];
  hasMore: boolean;
}

export interface ContentWatchPartyResponse {
  data: import('./watch-parties').WatchPartySummaryResponse[];
  hasMore: boolean;
}

export interface ContentSportType {
  id: string;
  code: string;
  name: string;
}

export interface EpisodeResponse {
  id: string;
  episodeNumber: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  runtime: number | null;
}

export interface EpisodeUpdateRequest {
  episodeNumber?: number;
  title?: string | null;
  description?: string | null;
  runtime?: number | null;
  removeThumbnail?: boolean;
}

export interface EpisodeCreateRequest {
  episodeNumber: number;
  title?: string;
  description?: string;
  runtime?: number;
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

export interface ContentPlatformCatalogItem {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface ContentUpdateRequest {
  title?: string;
  description?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  englishTitle?: string | null;
  genreIds?: string[];
  tags?: string[];
  casts?: ContentCastCreateRequest[];
  platforms?: ContentPlatformCreateRequest[];
  removeThumbnail?: boolean;
  duplicateConfirmed?: boolean;
  seriesTitle?: string;
  parentContentId?: string;
  createNewSeries?: boolean;
  seasonNumber?: number;
  episodeCount?: number | null;
  sportTypeId?: string;
  scheduledAt?: string | null;
  league?: string | null;
  season?: string | null;
  round?: string | null;
  homeTeam?: string;
  awayTeam?: string;
  venue?: string | null;
  country?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
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
  englishTitle?: string;
  casts?: ContentCastCreateRequest[];
  platforms?: ContentPlatformCreateRequest[];
}

export interface TvSeriesContentCreateRequest extends ContentCreateRequestBase {
  type: 'tvSeries';
  englishTitle?: string;
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
  description?: string;
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

export interface ContentSeriesSuggestion {
  id: string;
  title: string;
  originalTitle: string | null;
  englishTitle: string | null;
}

export interface ContentSeriesSearchResponse {
  data: ContentSeriesSuggestion[];
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
  likedByUserIdEqual?: string;
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
