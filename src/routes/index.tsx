import {
  Navigate,
  Route,
  RouterProvider,
  createHashRouter,
  createRoutesFromElements,
} from 'react-router-dom';

// Layouts
import RootLayout from '@/components/layout/RootLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

// Auth Pages
import SignInPage from '@/pages/sign-in/page';
import SignUpPage from '@/pages/sign-up/page';
import ResetPasswordPage from '@/pages/reset-password/page';

// Protected Pages
import ContentsPage from '@/pages/contents/page';
import ContentDetailPage from '@/pages/contents/[contentId]/page';
import PlaylistsPage from '@/pages/playlists/page';
import PlaylistDetailPage from '@/pages/playlists/[playlistId]/page';
import ProfilePage from '@/pages/profiles/[userId]/page';
import ConversationsPage from '@/pages/conversations/page';
import ConversationWithPage from '@/pages/conversations/with/page';
import AdminUsersPage from '@/pages/admin/users/page';
import WatchPartiesPage from '@/pages/watch-parties/page';
import WatchPartyRoomPage from '@/pages/watch-parties/[partyId]/page';

// Error Pages
import NotFoundPage from '@/pages/not-found/page';
import ProfileRoutePage from "@/pages/profiles/page.tsx";

const router = createHashRouter(
  createRoutesFromElements(
      <Route element={<RootLayout />}>
        {/* Public Auth Routes */}
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            {/* Home redirect to contents */}
            <Route index element={<Navigate to="/contents" replace />} />

            {/* Contents */}
            <Route path="/contents" element={<ContentsPage />} />
            <Route path="/contents/:contentId" element={<ContentDetailPage />} />

            {/* Watch Party */}
            <Route path="/watch-parties" element={<WatchPartiesPage />} />
            <Route path="/watch-parties/:partyId" element={<WatchPartyRoomPage />} />

            {/* Playlists */}
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />

            {/* Users */}
            <Route path="/profiles" element={<ProfileRoutePage />} />
            <Route path="/profiles/:userId" element={<ProfilePage />} />

            {/* Conversations */}
            <Route path="/conversations/with" element={<ConversationWithPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/conversations/:conversationId" element={<ConversationsPage />} />

            {/* Admin */}
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
  ),
);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
