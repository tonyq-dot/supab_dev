'use client';

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import api from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';

interface FiatRewardsDisplayProps {
  className?: string;
}

interface FiatRewardsSummary {
  total_fiat_earned: number;
  total_fiat_paid: number;
  total_fiat_pending: number;
  total_points_earned: number;
  total_achievements_earned: number;
  last_reward_at: string | null;
}

export default function FiatRewardsDisplay({ className = '' }: FiatRewardsDisplayProps) {
  const [summary, setSummary] = useState<FiatRewardsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.fiatRewards.getSummary();
        if (response.data) {
          setSummary(response.data);
        }
      } catch (error) {
        console.error('Error fetching fiat rewards summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
        <DollarSign className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      <DollarSign className="h-4 w-4 text-green-600" />
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {formatCurrency(summary.total_fiat_earned)}
        </span>
        <span className="text-xs text-gray-500">
          {summary.total_fiat_pending > 0 ? `${formatCurrency(summary.total_fiat_pending)} pending` : 'All paid'}
        </span>
      </div>
    </div>
  );
} 