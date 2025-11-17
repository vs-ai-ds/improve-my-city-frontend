import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/useAuth";
import { useToast } from "../toast/ToastProvider";
import { useEffect } from "react";

export default function ProtectedRoute({ 
  children, 
  requireRole 
}: { 
  children: React.ReactNode; 
  requireRole?: "admin" | "staff" | "super_admin" | ("admin" | "staff" | "super_admin")[];
}) {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (!user && location.pathname.startsWith("/admin")) {
      toast.show("Please log in to access admin pages");
    } else if (user && requireRole) {
      const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
      if (!roles.includes(user.role as any)) {
        toast.show("You don't have permission to access this page");
      }
    }
  }, [user, requireRole, location.pathname, toast]);

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!roles.includes(user.role as any)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

