import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { DemoPage } from '@/pages/DemoPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import { DocumentsListPage } from '@/pages/dashboard/DocumentsListPage';
import { WorkspacesListPage } from '@/pages/dashboard/WorkspacesListPage';
import { WorkspaceDetailPage } from '@/pages/dashboard/WorkspaceDetailPage';
import { StudioOverviewPage } from '@/pages/dashboard/StudioOverviewPage';
import { ActivityPage } from '@/pages/dashboard/ActivityPage';
import { NewWorkspacePage } from '@/pages/dashboard/NewWorkspacePage';
import { ProcessingPage } from '@/pages/dashboard/ProcessingPage';
import { DocumentWorkspace } from '@/pages/workspace/DocumentWorkspace';
import { OverviewTab } from '@/pages/workspace/OverviewTab';
import { AskTab } from '@/pages/workspace/AskTab';
import { KeyInfoTab } from '@/pages/workspace/KeyInfoTab';
import { DeadlinesTab } from '@/pages/workspace/DeadlinesTab';
import { RequirementsTab } from '@/pages/workspace/RequirementsTab';
import { RulesTab } from '@/pages/workspace/RulesTab';
import { EligibilityTab } from '@/pages/workspace/EligibilityTab';
import { ActionPlanTab } from '@/pages/workspace/ActionPlanTab';
import { StudioTab } from '@/pages/workspace/StudioTab';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<DashboardHome />} />
            <Route path="documents" element={<DocumentsListPage />} />
            <Route path="workspaces" element={<WorkspacesListPage />} />
            <Route path="studio" element={<StudioOverviewPage />} />
            <Route path="activity" element={<ActivityPage />} />
          </Route>

          <Route
            path="/workspace/new"
            element={
              <ProtectedRoute>
                <NewWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:workspaceId"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<WorkspaceDetailPage />} />
          </Route>
          <Route
            path="/workspace/:workspaceId/document/:documentId/processing"
            element={
              <ProtectedRoute>
                <ProcessingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:workspaceId/document/:documentId"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<DocumentWorkspace />}>
              <Route path="" element={<OverviewTab />} />
              <Route path="ask" element={<AskTab />} />
              <Route path="key-info" element={<KeyInfoTab />} />
              <Route path="requirements" element={<RequirementsTab />} />
              <Route path="deadlines" element={<DeadlinesTab />} />
              <Route path="rules" element={<RulesTab />} />
              <Route path="eligibility" element={<EligibilityTab />} />
              <Route path="action-plan" element={<ActionPlanTab />} />
              <Route path="studio" element={<StudioTab />} />
            </Route>
          </Route>

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<ProfilePage />} />
          </Route>

          <Route
            path="/demo"
            element={
              <ProtectedRoute>
                <DemoPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}
