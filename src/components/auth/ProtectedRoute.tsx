import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/useAuth";

export default function ProtectedRoute({ 
  children, 
  requireRole 
}: { 
  children: React.ReactNode; 
  requireRole?: "admin" | "staff" | "super_admin" | ("admin" | "staff" | "super_admin")[];
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to home with return path
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    const allowedRoles = ["super_admin", "admin", "staff"];
    const hasRole = roles.some(r => allowedRoles.includes(r));
    
    if (!hasRole || !roles.includes(user.role as any)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

