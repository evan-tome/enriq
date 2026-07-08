import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { AuthProvider } from "@/lib/auth-provider"
import { LandingPage } from "@/pages/landing-page"
import { LoginPage } from "@/pages/login-page"
import { ProfilePage } from "@/pages/profile-page"
import { RegisterPage } from "@/pages/register-page"
import { WorkspacePage } from "@/pages/workspace-page"
import { WorkspacesPage } from "@/pages/workspaces-page"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/workspaces" element={<WorkspacesPage />} />
              <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
