import { create } from 'zustand';
import { getUserById } from '@/lib/api/users';
import { createBaseStoreActions } from '@/lib/stores/actions';
import type { UserProfile } from '@/lib/types';
import type { BaseStore } from '@/lib/stores/types';

interface UserProfileParams {
  userId: string;
}

const useUserProfileStore = create<BaseStore<UserProfile, UserProfileParams>>((set, get) =>
  createBaseStoreActions<UserProfile, UserProfileParams>({
    set,
    get,
    fetchApi: (params) => getUserById(params.userId),
    initialData: {
      params: { userId: '' },
    },
  })
);

export default useUserProfileStore;
