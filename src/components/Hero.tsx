// File: src\components\Hero.tsx
// Project: improve-my-city-frontend
// Auto-added for reference


import { useAuth } from "../store/useAuth";
import { useReportModal } from "../store/useReportModal";

export default function Hero() {
  const { user } = useAuth();
  const { openWith } = useReportModal();
  function openReportOrLogin() {
    if (user) openWith();
    else window.dispatchEvent(new CustomEvent("imc:open-auth", { detail: { view: "login" } }));
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-12">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Improve My City</h1>
          <p className="mt-2 text-muted-foreground">
            Report local issues, track progress, and help your city respond faster.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={openReportOrLogin} className="...">Report an issue</button>
            {/* Remove Admin Portal here */}
          </div>
        </div>
        {/* (Optional) small visual / image / map preview */}
        <div className="rounded-2xl border bg-white/60 backdrop-blur p-4 shadow-sm">
          {/* Keep this lean; charts/cards go below */}
          <p className="text-sm text-muted-foreground">Be the change in your city ✨</p>
        </div>
      </div>
    </section>
  );
}