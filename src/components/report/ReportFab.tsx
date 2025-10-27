// File: src\components\report\ReportFab.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useState } from "react";
import ReportModal from "./ReportModal";
import AuthModal from "../auth/AuthModal";

function isLoggedIn() {
  return !!localStorage.getItem("access_token");
}

export default function ReportFab() {
  const [openReport, setOpenReport] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);

  function openFlow() {
    if (isLoggedIn()) setOpenReport(true);
    else setOpenAuth(true);
  }

  return (
    <>
      <button
        onClick={openFlow}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-blue-600 text-white shadow-xl px-4 py-3 text-sm md:hidden"
      >
        + Report
      </button>
      <ReportModal open={openReport} onClose={() => setOpenReport(false)} />
      <AuthModal
        open={openAuth}
        initialView="login"
        onClose={() => setOpenAuth(false)}
        onAuthed={() => {
          setOpenAuth(false);
          setOpenReport(true);
        }}
      />
    </>
  );
}