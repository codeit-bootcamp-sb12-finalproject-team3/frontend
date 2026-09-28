import PlaylistCard from "@/pages/playlists/components/PlaylistCard";
import useOwnedPlaylistStore from "@/lib/stores/useOwnedPlaylistStore";
import {useEffect, useRef} from "react";
import PlaylistCardSkeleton from "./PlaylistCardSkeleton";


export default function OwnedPlaylistsSection({userId}: {userId: string}) {
  const {
    data: ownedPlaylists,
    loading: ownedPlaylistsLoading,
    updateParams: updateOwnedPlaylistsParams,
    clear: clearOwnedPlaylists,
    count: ownedPlaylistsCount,
    hasNext: hasNextOwnedPlaylists,
    fetchMore: fetchMoreOwnedPlaylists,
  } = useOwnedPlaylistStore();

  const ownedPlaylistsTotal = ownedPlaylistsCount();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch owned playlists
  useEffect(() => {
    if (!userId) return;

    updateOwnedPlaylistsParams({
      ownerIdEqual: userId,
    });

    return () => {
      clearOwnedPlaylists();
    };
  }, [userId, updateOwnedPlaylistsParams, clearOwnedPlaylists]);

  // Observe the end of the list as the page itself scrolls.
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextOwnedPlaylists() || ownedPlaylistsLoading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextOwnedPlaylists() && !ownedPlaylistsLoading) {
        void fetchMoreOwnedPlaylists();
      }
    }, {root: null, rootMargin: '200px'});
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextOwnedPlaylists, ownedPlaylistsLoading, fetchMoreOwnedPlaylists, ownedPlaylists.length]);

  return (
    <>
      {/* Owned Playlists Section */}
      <section className="mb-[60px]">
        <div
            className="py-1 pl-2 pr-2"
        >
          {ownedPlaylistsLoading && ownedPlaylists.length === 0 ? (
              <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-[30px] gap-y-[40px]">
                {Array.from({ length: 6 }).map((_, index) => (
                    <PlaylistCardSkeleton key={index} />
                ))}
              </div>
          ) : ownedPlaylistsTotal === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-body1-m text-gray-400 mb-2">플레이리스트가 없습니다</p>
              </div>
          ) : (
              <div className="grid sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-[30px] gap-y-[40px]">
                {ownedPlaylists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
                {ownedPlaylistsLoading && ownedPlaylists.length > 0 && (
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
  );
}