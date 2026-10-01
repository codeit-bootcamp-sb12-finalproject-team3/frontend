const RECOMMENDATION_PREPARATION_KEY = 'mopl:recommendation-preparation';
const RECOMMENDATION_PREPARATION_TTL_MS = 5 * 60 * 1000;

interface RecommendationPreparationMarker {
  userId: string;
  createdAt: number;
}

function readRecommendationPreparationMarker() {
  try {
    const storedMarker = sessionStorage.getItem(RECOMMENDATION_PREPARATION_KEY);
    if (!storedMarker) return null;
    return JSON.parse(storedMarker) as RecommendationPreparationMarker;
  } catch {
    return null;
  }
}

function removeRecommendationPreparationMarker() {
  try {
    sessionStorage.removeItem(RECOMMENDATION_PREPARATION_KEY);
  } catch {
    return;
  }
}

export function markRecommendationPreparation(userId: string) {
  const marker: RecommendationPreparationMarker = {
    userId,
    createdAt: Date.now(),
  };

  try {
    sessionStorage.setItem(RECOMMENDATION_PREPARATION_KEY, JSON.stringify(marker));
  } catch {
    return;
  }
}

export function hasPendingRecommendationPreparation(userId: string) {
  const marker = readRecommendationPreparationMarker();
  if (!marker) {
    removeRecommendationPreparationMarker();
    return false;
  }

  const isCurrentUser = marker.userId === userId;
  const isRecent = Date.now() - marker.createdAt <= RECOMMENDATION_PREPARATION_TTL_MS;
  if (isCurrentUser && isRecent) return true;

  removeRecommendationPreparationMarker();
  return false;
}

export function clearRecommendationPreparation(userId: string) {
  const marker = readRecommendationPreparationMarker();
  if (marker && marker.userId !== userId) return;

  removeRecommendationPreparationMarker();
}
