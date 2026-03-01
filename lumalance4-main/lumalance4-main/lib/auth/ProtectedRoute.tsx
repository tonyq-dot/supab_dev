import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

/**
 * A component that protects routes by requiring authentication
 * Redirects to login page if user is not authenticated
 * Can also require admin privileges
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
    }

    // If admin only and user is not admin, redirect to dashboard
    if (!loading && user && adminOnly && !user.is_admin) {
      router.push('/dashboard');
    }
  }, [user, loading, adminOnly, router]);

  // Show nothing while loading or if not authenticated
  if (loading || !user) {
    return null;
  }

  // If admin only and user is not admin, show nothing
  if (adminOnly && !user.is_admin) {
    return null;
  }

  // If authenticated (and admin if required), show children
  return <>{children}</>;
};

export default ProtectedRoute;
