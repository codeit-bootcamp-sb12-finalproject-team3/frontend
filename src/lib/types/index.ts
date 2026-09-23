/**
 * Type Exports
 *
 * Centralized exports for commonly used types
 */

// Export commonly used schema types
import type { components, operations } from './api';
import type { ContentSearchParams } from './contents';
import type {
  CursorResponsePlaylistSummary,
  PlaylistSearchParams,
} from './playlists';

export type {
  ContentCreateRequest,
  ContentCreateResponse,
  ContentGenre,
  ContentSearchParams,
  ContentSort,
  ContentSportType,
  ContentSummaryResponse,
  ContentSummaryType,
  ContentTag,
  ContentTypeFilter,
  CursorResponseContentSummary,
} from './contents';
export type {
  CursorResponsePlaylistSummary,
  PlaylistContentSummary,
  PlaylistContentType,
  PlaylistDetail,
  PlaylistSearchParams,
  PlaylistSortBy,
  PlaylistSummary,
} from './playlists';
export type {
  CreateWatchPartyRequest,
  CursorPageWatchPartyResponse,
  WatchPartyContentSummary,
  WatchPartyHostSummary,
  WatchPartyChatMessage,
  WatchPartyChatSendRequest,
  WatchPartyPlaybackAction,
  WatchPartyPlaybackControlRequest,
  WatchPartyPlaybackState,
  WatchPartyPlaybackStatus,
  WatchPartyResponse,
  WatchPartySearchParams,
  WatchPartyStatus,
  WatchPartySummaryResponse,
} from './watch-parties';

// User types
export type UserDto = components['schemas']['UserDto'];
export type UserCreateRequest = components['schemas']['UserCreateRequest'];
export type UserUpdateRequest = components['schemas']['UserUpdateRequest'];
export type UserRoleUpdateRequest = components['schemas']['UserRoleUpdateRequest'];
export type UserLockUpdateRequest = components['schemas']['UserLockUpdateRequest'];
export type UserSummary = components['schemas']['UserSummary'];

// Auth types
export type SignInRequest = components['schemas']['SignInRequest'];
export type JwtDto = components['schemas']['JwtDto'];
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];
export type ChangePasswordRequest = components['schemas']['ChangePasswordRequest'];

// Content types
export type ContentDto = components['schemas']['ContentDto'];
export type ContentUpdateRequest = components['schemas']['ContentUpdateRequest'];
export type ContentSummary = components['schemas']['ContentSummary'];
export type ContentChatDto = {
  sender: UserSummary;
  content: string;
};

// Playlist types
export type PlaylistDto = components['schemas']['PlaylistDto'];
export type { PlaylistCreateRequest } from './playlists';
export type PlaylistUpdateRequest = components['schemas']['PlaylistUpdateRequest'];

// Review types
export type ReviewDto = components['schemas']['ReviewDto'];
export type ReviewCreateRequest = components['schemas']['ReviewCreateRequest'];
export type ReviewUpdateRequest = components['schemas']['ReviewUpdateRequest'];

// Conversation & Direct Message types
export type ConversationDto = components['schemas']['ConversationDto'];
export type ConversationCreateRequest = components['schemas']['ConversationCreateRequest'];
export type DirectMessageDto = components['schemas']['DirectMessageDto'];

// Follow types
export type FollowDto = components['schemas']['FollowDto'];
export type FollowRequest = components['schemas']['FollowRequest'];

// Notification types
export type NotificationDto = components['schemas']['NotificationDto'];

// Watching Session types
export type WatchingSessionDto = components['schemas']['WatchingSessionDto'];
export type WatchingSessionChange = {
  type: 'JOIN' | 'LEAVE';
  watchingSession: WatchingSessionDto;
  watcherCount: number;
}

// Cursor pagination types
export type CursorResponseUserDto = components['schemas']['CursorResponseUserDto'];
export type CursorResponseContentDto = components['schemas']['CursorResponseContentDto'];
export type CursorResponsePlaylistDto = CursorResponsePlaylistSummary;
export type CursorResponseReviewDto = components['schemas']['CursorResponseReviewDto'];
export type CursorResponseConversationDto = components['schemas']['CursorResponseConversationDto'];
export type CursorResponseDirectMessageDto = components['schemas']['CursorResponseDirectMessageDto'];
export type CursorResponseNotificationDto = components['schemas']['CursorResponseNotificationDto'];
export type CursorResponseWatchingSessionDto = components['schemas']['CursorResponseWatchingSessionDto'];

export type CursorResponse =
    CursorResponseUserDto
    | CursorResponseContentDto
    | CursorResponsePlaylistDto
    | CursorResponseReviewDto
    | CursorResponseConversationDto
    | CursorResponseDirectMessageDto
    | CursorResponseNotificationDto
    | CursorResponseWatchingSessionDto;


// Error types
export type ErrorResponse = components['schemas']['ErrorResponse'];

// Common enums and constants
export type UserRole = 'USER' | 'ADMIN';
export type ContentType = 'movie' | 'tvSeries' | 'sport';
export type SortDirection = 'ASCENDING' | 'DESCENDING';
export type NotificationLevel = 'INFO' | 'WARNING' | 'ERROR';


/**
 * API Query Parameter Types
 *
 * These types are extracted from operations for easier use in API modules
 */

// User query params
export type FindUsersParams = operations['findUsers']['parameters']['query'];

// Content query params
export type FindContentsParams = ContentSearchParams;

// Playlist query params
export type FindPlaylistsParams = PlaylistSearchParams;

// Review query params
export type FindReviewsParams = operations['findReviews']['parameters']['query'];

// Conversation & DM query params
export type FindConversationsParams = operations['findConversations']['parameters']['query'];
export type FindDmsParams = operations['findDms']['parameters']['query'];

// Notification query params
export type GetNotificationsParams = operations['getNotifications']['parameters']['query'];

// Watching session query params
export type FindWatchingSessionsByContentParams =
  operations['findWatchingSessionsByContent']['parameters']['query'];

export type CursorParams =
    FindUsersParams
    | FindContentsParams
    | PlaylistSearchParams
    | FindReviewsParams
    | FindConversationsParams
    | FindDmsParams
    | GetNotificationsParams
    | FindWatchingSessionsByContentParams;
