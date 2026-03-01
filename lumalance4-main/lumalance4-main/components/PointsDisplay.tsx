'use client';

import { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import api from '@/lib/api/client';

interface PointsDisplayProps {
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export default function PointsDisplay({ className = '', showIcon = true, compact = false }: PointsDisplayProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await api.points.getBalance();
        if (response.data) {
          setBalance(response.data.balance);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {showIcon && <Coins className="h-4 w-4 text-yellow-600" />}
        <span className="text-sm text-gray-500">...</span>
      </div>
    );
  }

  if (balance === null) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showIcon && <Coins className="h-4 w-4 text-yellow-600" />}
      <span className={`font-medium text-yellow-600 ${compact ? 'text-sm' : 'text-base'}`}>
        {balance.toLocaleString()} LP
      </span>
    </div>
  );
} 