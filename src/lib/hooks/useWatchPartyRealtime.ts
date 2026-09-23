import { useCallback, useEffect, useRef, useState } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { REALTIME_BASE_URL } from '@/lib/config/environment';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import type {
  WatchPartyChatMessage,
  WatchPartyChatSendRequest,
  WatchPartyPlaybackControlRequest,
  WatchPartyPlaybackState,
} from '@/lib/types';

interface UseWatchPartyRealtimeOptions {
  partyId?: string;
  accessToken?: string;
  onPlayback: (state: WatchPartyPlaybackState) => void;
  onChat: (message: WatchPartyChatMessage) => void;
  onServerError: (message: string) => void;
}

export function useWatchPartyRealtime({
  partyId,
  accessToken,
  onPlayback,
  onChat,
  onServerError,
}: UseWatchPartyRealtimeOptions) {
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<StompSubscription[]>([]);
  const handlersRef = useRef({ onPlayback, onChat, onServerError });
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    handlersRef.current = { onPlayback, onChat, onServerError };
  }, [onPlayback, onChat, onServerError]);

  useEffect(() => {
    if (!partyId || !accessToken) return;

    let active = true;
    setConnecting(true);

    const clearSubscriptions = () => {
      subscriptionsRef.current.forEach((subscription) => subscription.unsubscribe());
      subscriptionsRef.current = [];
    };

    const client = new Client({
      webSocketFactory: () => new SockJS(`${REALTIME_BASE_URL}/ws`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.beforeConnect = () => {
      const currentToken = useAuthStore.getState().getAccessToken() || accessToken;
      client.connectHeaders = { Authorization: `Bearer ${currentToken}` };
    };

    client.onConnect = () => {
      if (!active) return;
      clearSubscriptions();
      subscriptionsRef.current = [
        client.subscribe('/user/queue/errors', (message) => {
          handlersRef.current.onServerError(message.body);
        }),
        client.subscribe('/user/queue/playback-sync', (message) => {
          handlersRef.current.onPlayback(JSON.parse(message.body) as WatchPartyPlaybackState);
        }),
        client.subscribe(`/sub/watch-parties/${partyId}/chat`, (message) => {
          handlersRef.current.onChat(JSON.parse(message.body) as WatchPartyChatMessage);
        }),
        client.subscribe(`/sub/watch-parties/${partyId}/playback`, (message) => {
          handlersRef.current.onPlayback(JSON.parse(message.body) as WatchPartyPlaybackState);
        }),
      ];
      setConnected(true);
      setConnecting(false);
    };

    client.onStompError = (frame) => {
      if (!active) return;
      handlersRef.current.onServerError(frame.headers.message || '실시간 연결에 실패했습니다.');
      setConnected(false);
      setConnecting(false);
    };

    client.onWebSocketClose = () => {
      if (!active) return;
      subscriptionsRef.current = [];
      setConnected(false);
      setConnecting(client.active);
    };

    clientRef.current = client;
    client.activate();

    return () => {
      active = false;
      clearSubscriptions();
      clientRef.current = null;
      setConnected(false);
      setConnecting(false);
      void client.deactivate();
    };
  }, [partyId, accessToken]);

  const publish = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current;
    if (!client?.connected) return false;
    client.publish({ destination, body: JSON.stringify(body) });
    return true;
  }, []);

  const sendChat = useCallback((request: WatchPartyChatSendRequest) => {
    if (!partyId) return false;
    return publish(`/pub/watch-parties/${partyId}/chat`, request);
  }, [partyId, publish]);

  const controlPlayback = useCallback((request: WatchPartyPlaybackControlRequest) => {
    if (!partyId) return false;
    return publish(`/pub/watch-parties/${partyId}/playback`, request);
  }, [partyId, publish]);

  return { connected, connecting, sendChat, controlPlayback };
}
