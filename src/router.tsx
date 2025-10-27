// File: src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import ReportPage from "./pages/ReportPage";
import AdminPage from "./pages/AdminPage";
import IssuesTablePage from "./pages/admin/IssuesTablePage";
import IssueTypesPage from "./pages/admin/IssueTypesPage";
import AppSettingsPage from "./pages/admin/AppSettingsPage";
import ProfilePage from "./pages/ProfilePage";
import IssueDetailPage from "./pages/IssueDetailPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminSettingsPage from "./pages/AdminSettingsPage";



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
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminPage /> },  
          { path: "issues", element: <IssuesTablePage /> },
          { path: "issue-types", element: <IssueTypesPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
          // add users page later if you have it:
          // { path: "users", element: <AdminUsersPage /> },
        ],
      },
    ],
  },
]);