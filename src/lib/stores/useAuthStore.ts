import { create } from 'zustand';
import type { JwtDto } from '@/lib/types';
import type { BaseStore } from './types';
import {execute} from "@/lib/stores/utils";
import {createBaseStoreActions} from "@/lib/stores/actions.ts";
import { exchangeOAuth2Code, refreshToken, signIn, signOut as requestSignOut } from "@/lib/api/auth";

interface AuthStore extends BaseStore<JwtDto, unknown> {
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  signInWithOAuth: (code: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...createBaseStoreActions({
    set, get,
    fetchApi: refreshToken,
  }),
  signIn: async (email: string, password: string) => {
    await execute(
        set, get,
        () => signIn({ email, password }),
        {
          shouldThrow: true
        }
    )
  },

  signInWithOAuth: async (code: string) => {
    get().clear();

    await execute(
        set,
        get,
        () => exchangeOAuth2Code(code),
        { shouldThrow: true },
    );
  },

  signOut: async () => {
    try {
      await execute(set, get, requestSignOut);
    } finally {
      get().clear();
    }
  },

  isAuthenticated: () => {
    const { data } = get();
    return data?.accessToken != null;
  },

  getAccessToken: () => {
    const { data } = get();
    return data?.accessToken || null;
  },
}));

export default useAuthStore;
