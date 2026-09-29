import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import UserProfileSection from '@/pages/profiles/[userId]/components/UserProfileSection.tsx';
import OwnedPlaylistsSection from '@/pages/profiles/[userId]/components/OwnedPlaylistsSection.tsx';
import SubscribedPlaylistSection from '@/pages/profiles/[userId]/components/SubscribedPlaylistSection.tsx';
import LikedContentsSection from './components/LikedContentsSection';
import MyReviewsSection from './components/MyReviewsSection';
import ScheduledWatchPartiesSection from './components/ScheduledWatchPartiesSection';
import {Button} from '@/components/ui/button.tsx';
import useAuthStore from '@/lib/stores/useAuthStore';
import {getPlaylists} from '@/lib/api/playlists';
import {getContents} from '@/lib/api/contents';
import {getReviews} from '@/lib/api/reviews';
import {getScheduledWatchPartiesByMe} from '@/lib/api/watch-parties';

type ProfileTab = 'owned' | 'subscribed' | 'liked' | 'reviews' | 'scheduled';

type TabCounts = Record<ProfileTab, number | null>;
const emptyCounts: TabCounts = {owned: null, subscribed: null, liked: null, reviews: null, scheduled: null};

const tabs: {id: ProfileTab; label: string}[] = [
  {id: 'owned', label: '보유 플레이리스트'},
  {id: 'subscribed', label: '구독 플레이리스트'},
  {id: 'liked', label: '좋아요'},
  {id: 'reviews', label: '내 리뷰'},
  {id: 'scheduled', label: '시청 예약'},
];

export default function ProfilePage() {
  const {userId} = useParams<{userId: string}>();
  const navigate = useNavigate();
  const myUserId = useAuthStore((state) => state.data?.userDto.id);
  const isOwnProfile = myUserId === userId;
  const [activeTab, setActiveTab] = useState<ProfileTab>('owned');
  const [counts, setCounts] = useState<TabCounts>(emptyCounts);
  const visibleTabs = isOwnProfile ? tabs : tabs.slice(0, 2);
  const selectedTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : 'owned';

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setCounts(emptyCounts);

    const requests: {id: ProfileTab; request: Promise<number>}[] = [
      {id: 'owned', request: getPlaylists({ownerIdEqual: userId, limit: 1, sortBy: 'createdAt', sortDirection: 'DESCENDING'}).then((result) => result.totalCount)},
      {id: 'subscribed', request: getPlaylists({subscriberIdEqual: userId, limit: 1, sortBy: 'createdAt', sortDirection: 'DESCENDING'}).then((result) => result.totalCount)},
    ];
    if (isOwnProfile) {
      requests.push(
        {id: 'liked', request: getContents({likedByUserIdEqual: userId, limit: 1}).then((result) => result.totalCount)},
        {id: 'reviews', request: getReviews({userIdEqual: userId, limit: 1, sortBy: 'createdAt', sortDirection: 'DESCENDING'}).then((result) => result.totalCount)},
        {id: 'scheduled', request: getScheduledWatchPartiesByMe().then((parties) => parties.filter((party) => party.status === 'SCHEDULED' && new Date(party.scheduledAt).getTime() > Date.now()).length)},
      );
    }
    requests.forEach(({id, request}) => {
      request.then((count) => {
        if (!cancelled) setCounts((previous) => ({...previous, [id]: count}));
      }).catch(() => {
        // Keep an unavailable count as a dash instead of displaying an incorrect zero.
      });
    });
    return () => {cancelled = true;};
  }, [userId, isOwnProfile]);

  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-body1-m text-gray-300">사용자 ID를 알 수 없습니다.</p>
        <Button onClick={() => navigate(-1)}>뒤로 가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-[1680px] px-[70px] pt-[30px] pb-[60px]">
        <h1 className="mb-5 text-header1-sb text-gray-50">{isOwnProfile ? '마이페이지' : '프로필'}</h1>
        <UserProfileSection userId={userId}/>

        <div className="mt-5 border-b border-gray-700" role="tablist" aria-label="프로필 목록">
          <div className={`grid w-full ${isOwnProfile ? 'grid-cols-5' : 'grid-cols-2'}`}>
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`profile-tab-${tab.id}`}
                aria-selected={selectedTab === tab.id}
                aria-controls="profile-tab-panel"
                onClick={() => setActiveTab(tab.id)}
                className={`min-w-0 cursor-pointer border-b-2 px-1 py-3 text-center text-body1-m transition-colors ${
                  selectedTab === tab.id
                    ? 'border-gray-50 text-gray-50'
                    : 'border-transparent text-gray-400 hover:text-gray-100'
                }`}
              >
                <span className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
                  <span>{tab.label}</span>
                  <span className="text-body2-m text-gray-500">{counts[tab.id] ?? '–'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div id="profile-tab-panel" className="pt-8" role="tabpanel" aria-labelledby={`profile-tab-${selectedTab}`}>
          {selectedTab === 'owned' && <OwnedPlaylistsSection userId={userId}/>}
          {selectedTab === 'subscribed' && <SubscribedPlaylistSection userId={userId}/>}
          {selectedTab === 'liked' && isOwnProfile && <LikedContentsSection userId={myUserId!}/>}
          {selectedTab === 'reviews' && isOwnProfile && <MyReviewsSection userId={myUserId!}/>}
          {selectedTab === 'scheduled' && isOwnProfile && <ScheduledWatchPartiesSection/>}
        </div>
      </div>
    </div>
  );
}
