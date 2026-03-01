'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TelegramLogin from '@/components/TelegramLogin';
import GoogleLogin from '@/components/GoogleLogin';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState('/dashboard');
  const [isClient, setIsClient] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, [searchParams]);

  // Show loading until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to LumaLance</h1>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to LumaLance</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to access your freelance platform
          </p>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <GoogleLogin 
            onSuccess={() => router.push(redirectPath)}
            onError={(error) => setError(error)}
            className="w-full"
          />
          
          <div className="flex justify-center">
            <TelegramLogin 
              redirectPath={redirectPath}
              buttonSize="medium"
              cornerRadius={8}
              usePic={true}
              className="mt-2"
            />
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to LumaLance</h1>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
