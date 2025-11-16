// File: src\components\ui\Button.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children?: ReactNode;
}

export default function Button({ 
  className="", 
  variant = "primary",
  children,
  ...rest 
}: ButtonProps) {
  const variantClasses = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };
  
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium shadow disabled:opacity-50 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}