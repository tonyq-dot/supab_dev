'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import TelegramLogin from './TelegramLogin';

interface TelegramLinkAccountProps {
  onSuccess?: () => void;
  className?: string;
}

const TelegramLinkAccount: React.FC<TelegramLinkAccountProps> = ({
  onSuccess,
  className,
}) => {
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [telegramData, setTelegramData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has linked Telegram account
  useEffect(() => {
    const checkTelegramStatus = async () => {
      try {
        setLoading(true);
        const { data, error } = await api.telegram.getStatus();
        
        if (error) {
          setError('Failed to check Telegram account status');
          return;
        }
        
        if (data) {
          setIsLinked(data.isLinked);
          setTelegramData(data.telegramData);
        }
      } catch (err) {
        console.error('Error checking Telegram status:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    checkTelegramStatus();
  }, []);

  // Handle successful linking
  const handleLinkSuccess = () => {
    setIsLinked(true);
    if (onSuccess) {
      onSuccess();
    }
  };

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

  if (isLinked && telegramData) {
    return (
      <div className={`bg-card p-4 rounded-lg border border-border ${className}`}>
        <div className="flex items-center space-x-4">
          {telegramData.photoUrl && (
            <img 
              src={telegramData.photoUrl} 
              alt="Telegram Profile" 
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <h3 className="font-medium">
              {telegramData.firstName} {telegramData.lastName}
            </h3>
            {telegramData.username && (
              <p className="text-sm text-muted-foreground">
                @{telegramData.username}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center">
          <div className="flex-shrink-0 mr-2">
            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-green-600">
            Telegram account linked
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card p-4 rounded-lg border border-border ${className}`}>
      <h3 className="font-medium mb-2">Link Telegram Account</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Link your Telegram account for easier login and notifications
      </p>
      <TelegramLogin 
        onSuccess={handleLinkSuccess}
        buttonSize="medium"
        cornerRadius={8}
        usePic={true}
      />
    </div>
  );
};

export default TelegramLinkAccount;
