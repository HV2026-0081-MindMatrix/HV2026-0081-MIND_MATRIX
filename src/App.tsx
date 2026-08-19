import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { LandingPage } from '@/pages/LandingPage';
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
import { ActionPlanTab } from '@/pages/workspace/ActionPlanTab';
import { StudioTab } from '@/pages/workspace/StudioTab';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<DemoPage />} />

          {/* App */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="" element={<DashboardHome />} />
            <Route path="documents" element={<DocumentsListPage />} />
            <Route path="workspaces" element={<WorkspacesListPage />} />
            <Route path="studio" element={<StudioOverviewPage />} />
            <Route path="activity" element={<ActivityPage />} />
          </Route>

          <Route path="/workspace/new" element={<NewWorkspacePage />} />
          <Route path="/workspace/:workspaceId" element={<DashboardLayout />}>
            <Route path="" element={<WorkspaceDetailPage />} />
          </Route>
          <Route
            path="/workspace/:workspaceId/document/:documentId/processing"
            element={<ProcessingPage />}
          />
          <Route
            path="/workspace/:workspaceId/document/:documentId"
            element={<DashboardLayout />}
          >
            <Route path="" element={<DocumentWorkspace />}>
              <Route path="" element={<OverviewTab />} />
              <Route path="ask" element={<AskTab />} />
              <Route path="action-plan" element={<ActionPlanTab />} />
              <Route path="studio" element={<StudioTab />} />
            </Route>
          </Route>

          <Route path="/profile" element={<DashboardLayout />}>
            <Route path="" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}
