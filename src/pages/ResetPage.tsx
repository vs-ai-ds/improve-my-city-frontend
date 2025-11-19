// File: src\pages\ResetPage.tsx
// Project: improve-my-city-frontend
// Auto-added for reference

import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  useEffect(() => {
    if (token) {
      navigate("/", { 
        state: { 
          showLogin: true, 
          initialView: "reset",
          resetToken: token 
        } 
      });
    } else {
      navigate("/", { 
        state: { 
          showLogin: true, 
          initialView: "reset",
          resetError: "Missing reset token. Please use the link from your email."
        } 
      });
    }
  }, [token, navigate]);

  return null;
}