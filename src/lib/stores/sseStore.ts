import { EventSourcePolyfill } from 'event-source-polyfill';
import { create } from 'zustand';
import { REALTIME_BASE_URL } from '@/lib/config/environment';

type SseCallback = (data: unknown) => void;

let pendingConnection: Promise<void> | null = null;
let rejectPendingConnection: ((reason: Error) => void) | null = null;
let connectionHeaders: Record<string, string> | null = null;

interface SseState {
  eventSource: EventSource | null;
  isConnected: boolean;
  isConnecting: boolean;
  subscriptions: Map<string, SseCallback>;
  connect: (accessToken: string) => Promise<void>;
  disconnect: () => void;
  updateAccessToken: (accessToken: string) => void;
  subscribe: <T>(topic: string, callback: (data: T) => void) => void;
  unsubscribe: (topic: string) => void;
}

export const useSseStore = create<SseState>((set, get) => ({
  eventSource: null,
  isConnected: false,
  isConnecting: false,
  subscriptions: new Map(),

  connect: (accessToken: string) => {
    const { isConnected, isConnecting } = get();
    if (isConnected) return Promise.resolve();
    if (pendingConnection) return pendingConnection;
    if (isConnecting) {
      return Promise.reject(new Error('SSE connection is already retrying.'));
    }

    set({ isConnecting: true });

    const connection = new Promise<void>((resolve, reject) => {
      rejectPendingConnection = reject;

      try {
        connectionHeaders = {
          Authorization: `Bearer ${accessToken}`,
        };
        const eventSource = new EventSourcePolyfill(`${REALTIME_BASE_URL}/api/sse`, {
          headers: connectionHeaders,
          withCredentials: true,
        });

        let initialConnectionSettled = false;

        eventSource.onopen = () => {
          set({ eventSource, isConnected: true, isConnecting: false });
          if (!initialConnectionSettled) {
            initialConnectionSettled = true;
            resolve();
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] connection error:', error);
          const isClosed = eventSource.readyState === EventSourcePolyfill.CLOSED;
          set({
            isConnected: false,
            isConnecting: !isClosed,
            eventSource: isClosed ? null : eventSource,
          });

          if (!initialConnectionSettled) {
            initialConnectionSettled = true;
            reject(new Error('Initial SSE connection failed.'));
          }
        };

        get().subscriptions.forEach((callback, topic) => {
          eventSource.addEventListener(topic, callback);
        });

        set({ eventSource });
      } catch (error) {
        console.error('[SSE] failed to create connection:', error);
        set({ isConnected: false, isConnecting: false, eventSource: null });
        reject(error instanceof Error ? error : new Error('Failed to create SSE connection.'));
      }
    });

    pendingConnection = connection;
    const clearPendingConnection = () => {
      if (pendingConnection === connection) {
        pendingConnection = null;
        rejectPendingConnection = null;
      }
    };
    void connection.then(clearPendingConnection, clearPendingConnection);

    return connection;
  },

  disconnect: () => {
    const { eventSource, subscriptions } = get();
    connectionHeaders = null;
    if (!eventSource) return;

    rejectPendingConnection?.(new Error('SSE connection was disconnected.'));
    subscriptions.forEach((callback, topic) => {
      eventSource.removeEventListener(topic, callback);
    });
    eventSource.close();
    set({ eventSource: null, isConnected: false, isConnecting: false });
  },

  updateAccessToken: (accessToken: string) => {
    if (!connectionHeaders) return;

    // event-source-polyfill reads this same object again for each automatic reconnect.
    connectionHeaders.Authorization = `Bearer ${accessToken}`;
  },

  subscribe: <T>(topic: string, callback: (data: T) => void) => {
    const { eventSource, subscriptions } = get();
    if (subscriptions.has(topic)) return;

    const wrappedCallback = ((event: MessageEvent) => {
      try {
        callback(JSON.parse(event.data) as T);
      } catch (error) {
        console.error('[SSE] message parsing error:', error);
        callback(event.data as T);
      }
    }) as SseCallback;

    const nextSubscriptions = new Map(subscriptions);
    nextSubscriptions.set(topic, wrappedCallback);
    set({ subscriptions: nextSubscriptions });

    if (eventSource) {
      eventSource.addEventListener(topic, wrappedCallback);
    }
  },

  unsubscribe: (topic: string) => {
    const { eventSource, subscriptions } = get();
    const callback = subscriptions.get(topic);
    if (!callback) return;

    eventSource?.removeEventListener(topic, callback);
    const nextSubscriptions = new Map(subscriptions);
    nextSubscriptions.delete(topic);
    set({ subscriptions: nextSubscriptions });
  },
}));
