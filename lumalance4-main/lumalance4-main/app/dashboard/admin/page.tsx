'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Briefcase, 
  FileText, 
  MessageSquare, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Award,
  Coins,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';

interface PlatformStats {
  total_users: number;
  new_users_30d: number;
  new_users_7d: number;
  total_projects: number;
  new_projects_30d: number;
  active_projects: number;
  total_proposals: number;
  new_proposals_30d: number;
  accepted_proposals: number;
  total_milestones: number;
  completed_milestones: number;
  total_messages: number;
  messages_7d: number;
}

interface FinancialStats {
  total_payments: number;
  total_paid: number;
  total_pending: number;
  total_due: number;
  payment_count: number;
  paid_count: number;
  pending_count: number;
  due_count: number;
}

interface FiatRewardsStats {
  total_fiat_awarded: number;
  total_fiat_paid: number;
  total_fiat_pending: number;
  total_rewards: number;
  paid_rewards: number;
  pending_rewards: number;
}

interface PointsStats {
  total_points_balance: number;
  total_points_earned: number;
  total_points_spent: number;
  users_with_points: number;
}

interface UserActivityStats {
  active_users_7d: number;
  active_users_30d: number;
}

interface TopCategory {
  name: string;
  project_count: number;
  proposal_count: number;
}

interface TopSkill {
  name: string;
  project_count: number;
  freelancer_count: number;
}

interface MonthlyTrend {
  month: string;
  new_users: number;
  new_projects: number;
  new_proposals: number;
  new_milestones: number;
  total_payments: number;
}

interface AdminOverview {
  platform: PlatformStats;
  financial: FinancialStats;
  fiatRewards: FiatRewardsStats;
  points: PointsStats;
  userActivity: UserActivityStats;
  topCategories: TopCategory[];
  topSkills: TopSkill[];
  monthlyTrends: MonthlyTrend[];
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories' | 'skills'>('overview');

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.analytics.getAdminOverview();
        
        if (response.data) {
          setOverview(response.data);
        } else {
          setError(response.error || 'Failed to fetch admin overview');
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated]);

  const getGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatGrowthRate = (rate: number) => {
    const isPositive = rate >= 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
        {Math.abs(rate).toFixed(1)}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-gray-600">Loading admin overview...</p>
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
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Admin Overview</h1>
              <p className="text-gray-600">Platform statistics and insights</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'trends', label: 'Trends', icon: TrendingUp },
              { id: 'categories', label: 'Categories', icon: PieChart },
              { id: 'skills', label: 'Skills', icon: Target }
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

        {overview && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Platform Stats */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Users</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {overview.platform.total_users.toLocaleString()}
                          </p>
                          <div className="mt-1">
                            {formatGrowthRate(getGrowthRate(overview.platform.new_users_7d, overview.platform.new_users_30d / 4))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Briefcase className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Active Projects</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {overview.platform.active_projects.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.platform.new_projects_30d} new this month
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Proposals</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {overview.platform.total_proposals.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.platform.accepted_proposals} accepted
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <MessageSquare className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Messages</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {overview.platform.total_messages.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.platform.messages_7d} this week
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Stats */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Payments</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(overview.financial.total_payments)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.financial.payment_count} transactions
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
                          <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(overview.financial.total_paid)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.financial.paid_count} completed
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
                            {formatCurrency(overview.financial.total_pending)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.financial.pending_count} pending
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Due Amount</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(overview.financial.total_due)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.financial.due_count} overdue
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rewards & Points */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Rewards & Points</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Award className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Fiat Rewards</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(overview.fiatRewards.total_fiat_awarded)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.fiatRewards.total_rewards} rewards
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
                          <p className="text-sm font-medium text-gray-600">Fiat Paid</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(overview.fiatRewards.total_fiat_paid)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.fiatRewards.paid_rewards} paid
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Coins className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Points Balance</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {overview.points.total_points_balance.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {overview.points.users_with_points} users
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Activity className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Active Users</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {overview.userActivity.active_users_7d}
                          </p>
                          <p className="text-sm text-gray-500">
                            Last 7 days
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Monthly Trends</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            New Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            New Projects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            New Proposals
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            New Milestones
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payments
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {overview.monthlyTrends.map((trend, index) => (
                          <tr key={index}>
                                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                               {new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                             </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trend.new_users}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trend.new_projects}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trend.new_proposals}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trend.new_milestones}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(trend.total_payments)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Top Categories</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Projects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Proposals
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Engagement Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {overview.topCategories.map((category, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {category.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {category.project_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {category.proposal_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {category.project_count > 0 
                                ? ((category.proposal_count / category.project_count) * 100).toFixed(1)
                                : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Top Skills</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Skill
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Projects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Freelancers
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Demand Level
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {overview.topSkills.map((skill, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {skill.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {skill.project_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {skill.freelancer_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {skill.project_count > skill.freelancer_count ? 'High' : 
                               skill.project_count < skill.freelancer_count ? 'Low' : 'Balanced'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 