export type WatchPartyStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

export type WatchPartyPlaybackStatus = 'LIVE' | 'PAUSED' | 'ENDED';

export interface WatchPartyHostSummary {
  userId: string;
  name: string;
  profileImageUrl?: string | null;
}

export interface WatchPartyContentSummary {
  id: string;
  type: 'movie' | 'tvSeason';
  title: string;
  thumbnailUrl: string | null;
}

export interface WatchPartySummaryResponse {
  id: string;
  host: WatchPartyHostSummary;
  content: WatchPartyContentSummary;
  title: string;
  scheduledAt: string;
  status: WatchPartyStatus;
  maxParticipants: number;
  currentParticipantCount: number;
  createdAt: string;
}

export interface WatchPartyResponse extends WatchPartySummaryResponse {
  description: string | null;
  sessionDurationMinutes: number;
  startEpisode: number | null;
  endEpisode: number | null;
  endedAt: string | null;
  playbackStatus: WatchPartyPlaybackStatus | null;
  startedAt: number | null;
  accumulatedPauseMs: number | null;
  pausedAt: number | null;
}

export interface CreateWatchPartyRequest {
  contentId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  maxParticipants: number;
  sessionDurationMinutes: number;
  startEpisode?: number;
  endEpisode?: number;
}

export interface WatchPartySearchParams {
  statusEqual?: WatchPartyStatus;
  contentIdEqual?: string;
  cursor?: string;
  idAfter?: string;
  limit: number;
  sortDirection: 'ASCENDING' | 'DESCENDING';
}

export interface CursorPageWatchPartyResponse {
  data: WatchPartySummaryResponse[];
  nextCursor: string | null;
  nextIdAfter: string | null;
  hasNext: boolean;
  totalCount: number;
  sortBy: 'scheduledAt';
  sortDirection: 'ASCENDING' | 'DESCENDING';
}
