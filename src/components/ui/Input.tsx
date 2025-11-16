// File: src\components\ui\Input.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import type { InputHTMLAttributes } from "react";

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:bg-white shadow-sm ${props.className||""}`}
    />
  );
}