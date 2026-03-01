'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, TrendingUp, Trophy, Gift, ArrowUpRight, ArrowDownLeft, Users } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import PointsTransfer from '@/components/PointsTransfer';

interface PointBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

interface PointTransaction {
  id: number;
  transaction_hash: string;
  from_user_id: number | null;
  to_user_id: number | null;
  amount: number;
  transaction_type: string;
  status: string;
  reference_id: number | null;
  reference_type: string | null;
  metadata: any;
  created_at: string;
  from_name?: string;
  to_name?: string;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  points_reward: number;
  achievement_type: string;
  criteria: any;
  icon: string;
  rarity: string;
  earned: boolean;
  earned_at?: string;
}

interface LeaderboardEntry {
  balance: number;
  total_earned: number;
  total_spent: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export default function PointsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'achievements' | 'leaderboard'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const transactionsPerPage = 20;

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/points');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [balanceResponse, achievementsResponse, leaderboardResponse] = await Promise.all([
          api.points.getBalance(),
          api.points.getAchievements(),
          api.points.getLeaderboard({ limit: 10 })
        ]);
        
        if (balanceResponse.data) {
          setBalance(balanceResponse.data);
        }
        
        if (achievementsResponse.data) {
          setAchievements(achievementsResponse.data.achievements);
        }
        
        if (leaderboardResponse.data) {
          setLeaderboard(leaderboardResponse.data.leaderboard);
        }
        
        // Fetch transactions for current tab
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

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', transactionsPerPage.toString());
      params.append('offset', ((currentPage - 1) * transactionsPerPage).toString());
      
      const response = await api.points.getTransactions(params.toString());
      
      if (response.data) {
        setTransactions(response.data.transactions);
        setTotalTransactions(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, currentPage]);

  const getTransactionIcon = (transaction: PointTransaction) => {
    if (transaction.to_user_id === user?.id) {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    } else {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'milestone_completion':
        return 'Milestone Completed';
      case 'achievement':
        return 'Achievement Unlocked';
      case 'transfer':
        return 'Transfer';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  const totalPages = Math.ceil(totalTransactions / transactionsPerPage);

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
            <Coins className="h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-2xl font-bold">Points & Achievements</h1>
              <p className="text-gray-600">Your crypto-like points system</p>
            </div>
          </div>
          <PointsTransfer onTransferComplete={() => {
            // Refresh data after transfer
            window.location.reload();
          }} />
        </div>

        {/* Balance Card */}
        {balance && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium mb-2">Current Balance</h2>
                <div className="text-4xl font-bold mb-2">{balance.balance.toLocaleString()} LP</div>
                <p className="text-yellow-100">LumaLance Points</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-yellow-100 mb-1">Total Earned</div>
                <div className="text-xl font-semibold">{balance.total_earned.toLocaleString()} LP</div>
                <div className="text-sm text-yellow-100 mt-1">Total Spent</div>
                <div className="text-xl font-semibold">{balance.total_spent.toLocaleString()} LP</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'transactions', label: 'Transactions', icon: ArrowUpRight },
              { id: 'achievements', label: 'Achievements', icon: Trophy },
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
            {/* Recent Achievements */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Recent Achievements
              </h3>
              {achievements.filter(a => a.earned).slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{achievement.name}</div>
                    <div className="text-xs text-gray-500">+{achievement.points_reward} LP</div>
                  </div>
                </div>
              ))}
              {achievements.filter(a => a.earned).length === 0 && (
                <p className="text-gray-500 text-sm">No achievements earned yet</p>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ArrowUpRight className="h-5 w-5 mr-2 text-blue-600" />
                Recent Transactions
              </h3>
              {transactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTransactionIcon(transaction)}
                    <span className="text-sm font-medium">
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      transaction.to_user_id === user?.id ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.to_user_id === user?.id ? '+' : '-'}{transaction.amount} LP
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-gray-500 text-sm">No transactions yet</p>
              )}
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
                    {entry.balance.toLocaleString()} LP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowUpRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">
                  Complete milestones to earn your first points!
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(transaction)}
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {getTransactionTypeLabel(transaction.transaction_type)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {formatDate(transaction.created_at)}
                            </p>
                            {transaction.metadata?.message && (
                              <p className="text-sm text-gray-600 mt-1">
                                {transaction.metadata.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            transaction.to_user_id === user?.id ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.to_user_id === user?.id ? '+' : '-'}{transaction.amount} LP
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {transaction.transaction_hash.slice(0, 8)}...
                          </div>
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
                        Showing {((currentPage - 1) * transactionsPerPage) + 1} to{' '}
                        {Math.min(currentPage * transactionsPerPage, totalTransactions)} of{' '}
                        {totalTransactions} transactions
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

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                achievement.earned ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{achievement.icon}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRarityColor(achievement.rarity)}`}>
                    {achievement.rarity}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2">{achievement.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{achievement.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Reward: <span className="font-medium text-yellow-600">+{achievement.points_reward} LP</span>
                  </div>
                  {achievement.earned && (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ Earned {achievement.earned_at && formatDate(achievement.earned_at)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Points Leaderboard</h3>
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
                          Total earned: {entry.total_earned.toLocaleString()} LP
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {entry.balance.toLocaleString()} LP
                      </div>
                      <div className="text-sm text-gray-500">
                        Balance
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