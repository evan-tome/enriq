import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/lib/auth-provider"
import { LandingPage } from "@/pages/landing-page"
import { LoginPage } from "@/pages/login-page"
import { ProfilePage } from "@/pages/profile-page"
import { RegisterPage } from "@/pages/register-page"
import {
  InboxRoute,
  IssuesRoute,
  MembersRoute,
  OverviewRoute,
  SettingsRoute,
  WebhookSourcesRoute,
  WorkspaceDetailPage,
} from "@/pages/workspace-detail-page"
import { WorkspacesPage } from "@/pages/workspaces-page"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider delay={200}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<OverviewRoute />} />
                  <Route path="settings" element={<SettingsRoute />} />
                  <Route path="webhook-sources" element={<WebhookSourcesRoute />} />
                  <Route path="inbox" element={<InboxRoute />} />
                  <Route path="issues" element={<IssuesRoute />} />
                  <Route path="members" element={<MembersRoute />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
