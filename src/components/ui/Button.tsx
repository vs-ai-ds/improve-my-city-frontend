// File: src\components\ui\Button.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { ButtonHTMLAttributes } from "react";

export default function Button({ className="", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50 ${className}`}
    />
  );
}