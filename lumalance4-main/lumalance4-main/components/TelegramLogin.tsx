'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { setToken, setRefreshToken } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface TelegramLoginProps {
  onSuccess?: () => void;
  redirectPath?: string;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | undefined;
  usePic?: boolean;
  className?: string;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: any) => void;
    };
  }
}

const TelegramLogin: React.FC<TelegramLoginProps> = ({
  onSuccess,
  redirectPath = '/dashboard',
  buttonSize = 'medium',
  cornerRadius = 4,
  requestAccess,
  usePic = true,
  className,
}) => {
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const telegramRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { updateUser } = useAuth();
  
  // Set up Telegram callback function FIRST (before script loads)
  useEffect(() => {
    console.log('Setting up Telegram callback function...');
    
    window.TelegramLoginWidget = {
      dataOnauth: async (user) => {
        console.log('Telegram auth callback triggered with user:', user);
        try {
          const { data, error } = await api.telegram.auth(user);
          
          if (error) {
            console.error('Telegram auth API error:', error);
            setError(error);
            return;
          }
          
          if (data?.token && data?.refreshToken) {
            console.log('Setting auth tokens...');
            setToken(data.token);
            setRefreshToken(data.refreshToken);
            
            // Fetch user data
            const userResponse = await api.auth.me();
            
            if (userResponse.data) {
              console.log('Updating user data:', userResponse.data);
              updateUser(userResponse.data);
              
              if (onSuccess) {
                onSuccess();
              } else {
                router.push(redirectPath);
              }
            }
          } else {
            console.error('No token received from Telegram auth');
            setError('Authentication failed - no token received');
          }
        } catch (err) {
          console.error('Telegram auth error:', err);
          setError('An unexpected error occurred during Telegram authentication');
        }
      },
    };
    
    console.log('Telegram callback function set up successfully');
  }, [onSuccess, redirectPath, router, updateUser]);
  
  // Get bot username from API
  useEffect(() => {
    const fetchBotUsername = async () => {
      try {
        setLoading(true);
        console.log('Fetching bot username from API...');
        const { data, error } = await api.telegram.getWidgetData();
        
        if (error) {
          console.error('Failed to get widget data:', error);
          setError('Failed to load Telegram login widget');
          return;
        }
        
        if (data?.botUsername) {
          console.log('Bot username received:', data.botUsername);
          setBotUsername(data.botUsername);
        } else {
          console.error('No bot username in response');
          setError('Telegram bot not configured');
        }
      } catch (err) {
        console.error('Error loading Telegram widget data:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBotUsername();
  }, []);
  
  // Load Telegram widget script AFTER callback is set up and bot username is available
  useEffect(() => {
    if (!botUsername || !telegramRef.current) return;
    
    console.log('Loading Telegram widget script with bot:', botUsername);
    
    // Clear previous content
    telegramRef.current.innerHTML = '';
    
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    
    if (requestAccess) {
      script.setAttribute('data-request-access', requestAccess);
    }
    
    if (usePic) {
      script.setAttribute('data-userpic', 'true');
    }
    
    // Add error handling for script loading
    script.onerror = () => {
      console.error('Failed to load Telegram widget script');
      setError('Failed to load Telegram login widget');
    };
    
    script.onload = () => {
      console.log('Telegram widget script loaded successfully');
    };
    
    // Add script to the container div
    telegramRef.current.appendChild(script);
    
    return () => {
      if (telegramRef.current) {
        telegramRef.current.innerHTML = '';
      }
    };
  }, [botUsername, buttonSize, cornerRadius, requestAccess, usePic]);
  
  if (loading) {
    return (
      <div className={`flex justify-center items-center h-10 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`text-destructive text-sm ${className}`}>
        {error}
      </div>
    );
  }
  
  if (!botUsername) {
    return null;
  }
  
  return (
    <div ref={telegramRef} className={className}>
      {/* Telegram script will inject the button here */}
    </div>
  );
};

export default TelegramLogin;
