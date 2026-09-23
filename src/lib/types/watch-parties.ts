export type WatchPartyStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';

export type WatchPartyPlaybackStatus = 'LIVE' | 'PAUSED' | 'ENDED';

export type WatchPartyPlaybackAction = 'PLAY' | 'PAUSE' | 'SEEK';

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

export interface WatchPartyPlaybackState {
  status: WatchPartyPlaybackStatus;
  startedAt: number;
  accumulatedPauseMs: number;
  pausedAt: number | null;
  startEpisode: number | null;
  endEpisode: number | null;
  hostId: string;
  updatedAt: number;
}

export interface WatchPartyPlaybackControlRequest {
  action: WatchPartyPlaybackAction;
  targetElapsedMs?: number;
}

export interface WatchPartyChatSendRequest {
  content: string;
}

export interface WatchPartyChatMessage {
  senderId: string;
  content: string;
  sentAt: number;
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
