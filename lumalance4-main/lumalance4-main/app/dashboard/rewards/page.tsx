'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Trophy, TrendingUp, Clock, CheckCircle, Gift, Users } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';

interface FiatRewardsSummary {
  total_fiat_earned: number;
  total_fiat_paid: number;
  total_fiat_pending: number;
  total_points_earned: number;
  total_achievements_earned: number;
  last_reward_at: string | null;
}

interface FiatReward {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  currency: string;
  status: string;
  reference_id: number | null;
  reference_type: string | null;
  metadata: any;
  paid_at: string | null;
  created_at: string;
  category_name: string;
  category_description: string;
  icon: string;
  rarity: string;
}

interface RewardCategory {
  id: number;
  name: string;
  description: string;
  fiat_reward: number;
  points_reward: number;
  category_type: string;
  criteria: any;
  icon: string;
  rarity: string;
  is_active: boolean;
}

interface FiatTransaction {
  id: number;
  transaction_id: string;
  user_id: number;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  reference_id: number | null;
  reference_type: string | null;
  metadata: any;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

interface LeaderboardEntry {
  total_fiat_earned: number;
  total_fiat_paid: number;
  total_achievements_earned: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export default function RewardsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [summary, setSummary] = useState<FiatRewardsSummary | null>(null);
  const [rewards, setRewards] = useState<FiatReward[]>([]);
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [transactions, setTransactions] = useState<FiatTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'transactions' | 'categories' | 'leaderboard'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRewards, setTotalRewards] = useState(0);
  const rewardsPerPage = 20;

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/rewards');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [summaryResponse, categoriesResponse, leaderboardResponse] = await Promise.all([
          api.fiatRewards.getSummary(),
          api.fiatRewards.getCategories(),
          api.fiatRewards.getLeaderboard({ limit: 10 })
        ]);
        
        if (summaryResponse.data) {
          setSummary(summaryResponse.data);
        }
        
        if (categoriesResponse.data) {
          setCategories(categoriesResponse.data.categories);
        }
        
        if (leaderboardResponse.data) {
          setLeaderboard(leaderboardResponse.data.leaderboard);
        }
        
        // Fetch rewards for current tab
        if (activeTab === 'rewards') {
          await fetchRewards();
        }
        
        if (activeTab === 'transactions') {
          await fetchTransactions();
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, activeTab]);

  const fetchRewards = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', rewardsPerPage.toString());
      params.append('offset', ((currentPage - 1) * rewardsPerPage).toString());
      
      const response = await api.fiatRewards.getRewards(params.toString());
      
      if (response.data) {
        setRewards(response.data.rewards);
        setTotalRewards(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', rewardsPerPage.toString());
      params.append('offset', ((currentPage - 1) * rewardsPerPage).toString());
      
      const response = await api.fiatRewards.getTransactions(params.toString());
      
      if (response.data) {
        setTransactions(response.data.transactions);
        setTotalRewards(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'rewards') {
      fetchRewards();
    }
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, currentPage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-purple-100 text-purple-800';
      case 'epic':
        return 'bg-blue-100 text-blue-800';
      case 'rare':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalRewards / rewardsPerPage);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold">Fiat Rewards</h1>
              <p className="text-gray-600">Earn real money for your achievements</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.total_fiat_earned)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.total_fiat_paid)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.total_fiat_pending)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Achievements</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.total_achievements_earned}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'rewards', label: 'My Rewards', icon: Gift },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'categories', label: 'Categories', icon: Trophy },
              { id: 'leaderboard', label: 'Leaderboard', icon: Users }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Recent Rewards */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Gift className="h-5 w-5 mr-2 text-green-600" />
                Recent Rewards
              </h3>
              {rewards.slice(0, 3).map((reward) => (
                <div key={reward.id} className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">{reward.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{reward.category_name}</div>
                    <div className="text-xs text-gray-500">+{formatCurrency(reward.amount)}</div>
                  </div>
                  {getStatusBadge(reward.status)}
                </div>
              ))}
              {rewards.length === 0 && (
                <p className="text-gray-500 text-sm">No rewards earned yet</p>
              )}
            </div>

            {/* Available Categories */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-blue-600" />
                Available Rewards
              </h3>
              {categories.slice(0, 3).map((category) => (
                <div key={category.id} className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{category.icon}</span>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    +{formatCurrency(category.fiat_reward)}
                  </div>
                </div>
              ))}
            </div>

            {/* Leaderboard Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Top Earners
              </h3>
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div key={index} className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="text-sm font-medium">
                      {entry.display_name || entry.email.split('@')[0]}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(entry.total_fiat_earned)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {rewards.length === 0 ? (
              <div className="p-8 text-center">
                <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards yet</h3>
                <p className="text-gray-600">
                  Complete milestones and achievements to earn fiat rewards!
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{reward.icon}</span>
                          <div>
                            <h4 className="font-medium text-gray-900">{reward.category_name}</h4>
                            <p className="text-sm text-gray-500">{reward.category_description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Earned: {formatDate(reward.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{formatCurrency(reward.amount)}
                          </div>
                          {getStatusBadge(reward.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * rewardsPerPage) + 1} to{' '}
                        {Math.min(currentPage * rewardsPerPage, totalRewards)} of{' '}
                        {totalRewards} rewards
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">
                  Your fiat reward transactions will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {transaction.transaction_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.created_at)}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-1">
                            {transaction.transaction_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{formatCurrency(transaction.amount)}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * rewardsPerPage) + 1} to{' '}
                        {Math.min(currentPage * rewardsPerPage, totalRewards)} of{' '}
                        {totalRewards} transactions
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{category.icon}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRarityColor(category.rarity)}`}>
                    {category.rarity}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">{category.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Reward: <span className="font-medium text-green-600">+{formatCurrency(category.fiat_reward)}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    +{category.points_reward} LP
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Fiat Rewards Leaderboard</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {leaderboard.map((entry, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                        <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {entry.display_name || entry.email.split('@')[0]}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {entry.total_achievements_earned} achievements earned
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(entry.total_fiat_earned)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total Earned
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 