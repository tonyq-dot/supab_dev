// Temporarily disabled due to import issues
// import { TelegramLoginButton } from '@telegram-auth/react';
import { FC } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginProps {
  onAuth: (user: TelegramUser) => void;
  className?: string;
}

const TelegramLogin: FC<TelegramLoginProps> = ({ onAuth, className }) => {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    console.error('NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set');
    return null;
  }

  // ✅ TEMPORARY FIX: Using fallback message while import is fixed
  return (
    <div className={className}>
      <div className="p-4 text-center border border-gray-300 rounded-lg">
        <p className="text-sm text-gray-600">
          Telegram login temporarily unavailable. Please use email login.
        </p>
      </div>
    </div>
  );
};

export default TelegramLogin; 