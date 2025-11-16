// File: src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import ReportPage from "./pages/ReportPage";
import IssuesTablePage from "./pages/admin/IssuesTablePage";
import IssueTypesPage from "./pages/admin/IssueTypesPage";
import ProfilePage from "./pages/ProfilePage";
import IssueDetailPage from "./pages/IssueDetailPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminLandingPage from "./pages/admin/AdminLandingPage";


export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "report", element: <ReportPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "issues/:id", element: <IssueDetailPage /> },
      {
        path: "/admin", element: <AdminLayout />, children: [
        { index: true, element: <AdminLandingPage /> }, // <— landing
        { path: "issues", element: <IssuesTablePage /> },
        { path: "issue-types", element: <IssueTypesPage /> },
        { path: "users", element: <AdminUsersPage /> },
        { path: "settings", element: <AdminSettingsPage /> },
        ]
      }
    ],
  },
]);