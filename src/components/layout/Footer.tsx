// File: src\components\layout\Footer.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-600 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Improve My City</p>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
        </div>
      </div>
    </footer>
  );
}