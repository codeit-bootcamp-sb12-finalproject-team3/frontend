import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { create } from 'zustand';
import { REALTIME_BASE_URL } from '@/lib/config/environment';
import { useAuthStore } from '@/lib/stores/useAuthStore';

interface WebSocketState {
  stompClient: Client | null;
  isConnected: boolean;
  isConnecting: boolean;
  subscriptions: Map<string, StompSubscription>;
  connect: (accessToken: string) => Promise<void>;
  disconnect: () => void;
  subscribe: <T>(destination: string, callback: (message: T) => void) => void;
  unsubscribe: (destination: string) => void;
  send: (destination: string, body: unknown) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  stompClient: null,
  isConnected: false,
  isConnecting: false,
  subscriptions: new Map(),

  connect: async (accessToken: string) => {
    const { isConnected, isConnecting } = get();
    if (isConnected || isConnecting) return;

    set({ isConnecting: true });

    return new Promise<void>((resolve, reject) => {
      let initialConnectionSettled = false;
      const client = new Client({
        webSocketFactory: () => new SockJS(`${REALTIME_BASE_URL}/ws`),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      client.beforeConnect = () => {
        const currentAccessToken = useAuthStore.getState().getAccessToken() || accessToken;
        client.connectHeaders = {
          Authorization: `Bearer ${currentAccessToken}`,
        };
      };

      client.onConnect = () => {
        set({ stompClient: client, isConnected: true, isConnecting: false });
        if (!initialConnectionSettled) {
          initialConnectionSettled = true;
          resolve();
        }
      };

      client.onStompError = (frame) => {
        console.error('STOMP error:', frame);
        set({ isConnected: false, isConnecting: false });
        if (!initialConnectionSettled) {
          initialConnectionSettled = true;
          reject(new Error(frame.headers.message || 'STOMP connection failed.'));
        }
      };

      client.onWebSocketClose = () => {
        set({ isConnected: false, isConnecting: client.active });
        if (!initialConnectionSettled) {
          initialConnectionSettled = true;
          reject(new Error('WebSocket closed before STOMP connected.'));
        }
      };

      set({ stompClient: client });
      client.activate();
    });
  },

  disconnect: () => {
    const { stompClient } = get();
    if (stompClient) {
      void stompClient.deactivate();
      set({
        stompClient: null,
        isConnected: false,
        isConnecting: false,
        subscriptions: new Map(),
      });
    }
  },

  subscribe: <T>(destination: string, callback: (message: T) => void) => {
    const { stompClient, isConnected, subscriptions } = get();
    if (subscriptions.has(destination) || !isConnected || !stompClient) return;

    const subscription = stompClient.subscribe(destination, (message) => {
      callback(JSON.parse(message.body) as T);
    });

    const nextSubscriptions = new Map(subscriptions);
    nextSubscriptions.set(destination, subscription);
    set({ subscriptions: nextSubscriptions });
  },

  unsubscribe: (destination: string) => {
    const { subscriptions } = get();
    const subscription = subscriptions.get(destination);
    if (!subscription) return;

    subscription.unsubscribe();
    const nextSubscriptions = new Map(subscriptions);
    nextSubscriptions.delete(destination);
    set({ subscriptions: nextSubscriptions });
  },

  send: (destination: string, body: unknown) => {
    const { stompClient, isConnected } = get();
    if (!stompClient || !isConnected) {
      console.error('WebSocket is not connected.');
      return;
    }

    stompClient.publish({ destination, body: JSON.stringify(body) });
  },
}));
