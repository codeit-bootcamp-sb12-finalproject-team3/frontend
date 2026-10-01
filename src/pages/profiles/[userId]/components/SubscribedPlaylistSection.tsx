import PlaylistCardSkeleton from "@/pages/profiles/[userId]/components/PlaylistCardSkeleton.tsx";
import PlaylistCard from "@/pages/playlists/components/PlaylistCard.tsx";
import usePlaylistSubscriptionStore from "@/lib/stores/usePlaylistSubscriptionStore.ts";
import {useEffect, useRef} from "react";

export default function SubscribedPlaylistSection({userId}: {userId: string}) {

  const {
    data: subscribedPlaylists,
    loading: subscribedPlaylistsLoading,
    updateParams: updateSubscribedPlaylistsParams,
    clear: clearSubscribedPlaylists,
    count: subscribedPlaylistsCount,
    hasNext: hasNextSubscribedPlaylists,
    fetchMore: fetchMoreSubscribedPlaylists,
  } = usePlaylistSubscriptionStore();

  // Local state
  const subscribedPlaylistsTotal = subscribedPlaylistsCount();

  // Refs for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch subscribed playlists
  useEffect(() => {
    if (!userId) return;

    updateSubscribedPlaylistsParams({
      subscriberIdEqual: userId,
    });

    return () => {
      clearSubscribedPlaylists();
    };
  }, [userId, updateSubscribedPlaylistsParams, clearSubscribedPlaylists]);

  // Observe the end of the list as the page itself scrolls.
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextSubscribedPlaylists() || subscribedPlaylistsLoading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextSubscribedPlaylists() && !subscribedPlaylistsLoading) {
        void fetchMoreSubscribedPlaylists();
      }
    }, {root: null, rootMargin: '200px'});
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextSubscribedPlaylists, subscribedPlaylistsLoading, fetchMoreSubscribedPlaylists, subscribedPlaylists.length]);

  return (
      <>
        {/* Subscribed Playlists Section */}
        <section>
          <div
                className="py-1 pl-2 pr-2"
          >
            {subscribedPlaylistsLoading && subscribedPlaylists.length === 0 ? (
                <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-[30px] gap-y-[40px]">
                  {Array.from({ length: 6 }).map((_, index) => (
                      <PlaylistCardSkeleton key={index} />
                  ))}
                </div>
            ) : subscribedPlaylistsTotal === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-body1-m text-gray-400 mb-2">구독 중인 플레이리스트가 없습니다</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-[30px] gap-y-[40px]">
                  {subscribedPlaylists.map((playlist) => (
                      <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                  {subscribedPlaylistsLoading && subscribedPlaylists.length > 0 && (
                      <>
                        {Array.from({ length: 3 }).map((_, index) => (
                            <PlaylistCardSkeleton key={`skeleton-${index}`} />
                        ))}
                      </>
                  )}
                </div>
            )}
          </div>
          <div ref={loadMoreRef} aria-hidden="true" className="h-px" />
        </section>
      </>
  )
}