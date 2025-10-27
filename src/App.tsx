// File: src\App.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { Outlet } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ReportFab from "./components/report/ReportFab";
import ChatMini from "./components/ChatMini"
import "./theme.css";

export default function App() {
  return (
    <div className="min-h-dvh flex flex-col bg-[radial-gradient(1000px_500px_at_50%_-10%,rgba(59,130,246,0.08),transparent),linear-gradient(to_bottom,white,rgba(255,255,255,0.9))]">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Outlet />
        </div>
      </main>
      <ReportFab />
      <ChatMini />
      <Footer />
    </div>
  );
}