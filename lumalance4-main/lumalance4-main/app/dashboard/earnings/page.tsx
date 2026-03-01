'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Target,
  Award,
  Briefcase,
  MessageSquare,
  Star
} from 'lucide-react';
import api from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';

interface CurrentMonthEarnings {
  total_earned: number;
  milestone_count: number;
  paid_amount: number;
  pending_amount: number;
}

interface LastMonthEarnings {
  total_earned: number;
  milestone_count: number;
  paid_amount: number;
}

interface PeriodEarnings {
  total_earned: number;
  milestone_count: number;
  paid_amount: number;
  pending_amount: number;
  days: number;
}

interface FiatRewards {
  total_earned: number;
  reward_count: number;
  paid_amount: number;
  pending_amount: number;
}

interface UpcomingPayment {
  id: number;
  title: string;
  amount: number;
  due_date: string;
  project_title: string;
  project_id: number;
}

interface EarningsByProject {
  id: number;
  title: string;
  total_earned: number;
  payment_count: number;
  paid_amount: number;
  pending_amount: number;
}

interface MonthlyTrend {
  month: string;
  total_earned: number;
  payment_count: number;
  paid_amount: number;
}

interface Estimates {
  avgDailyEarnings: number;
  estimatedMonthlyEarnings: number;
  completionRate: number;
}

interface MilestoneStats {
  total_milestones: number;
  completed_milestones: number;
  in_progress_milestones: number;
  pending_milestones: number;
}

interface FreelancerEarnings {
  currentMonth: CurrentMonthEarnings;
  lastMonth: LastMonthEarnings;
  period: PeriodEarnings;
  fiatRewards: FiatRewards;
  upcomingPayments: UpcomingPayment[];
  earningsByProject: EarningsByProject[];
  monthlyTrend: MonthlyTrend[];
  estimates: Estimates;
  milestoneStats: MilestoneStats;
}

interface PerformanceMetrics {
  projects: {
    total_projects: number;
    completed_projects: number;
    active_projects: number;
  };
  proposals: {
    total_proposals: number;
    accepted_proposals: number;
    rejected_proposals: number;
    pending_proposals: number;
    successRate: number;
  };
  milestones: {
    avgCompletionDays: number;
    completed_count: number;
  };
  satisfaction: {
    avg_rating: number;
    review_count: number;
  };
  communication: {
    total_messages: number;
    conversations: number;
    avg_response_hours: number;
  };
  skills: Array<{
    name: string;
    project_count: number;
    unique_projects: number;
  }>;
}

export default function EarningsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [earnings, setEarnings] = useState<FreelancerEarnings | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'performance' | 'projects'>('overview');
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/earnings');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [earningsResponse, performanceResponse] = await Promise.all([
          api.analytics.getFreelancerEarnings({ period }),
          api.analytics.getFreelancerPerformance()
        ]);
        
        if (earningsResponse.data) {
          setEarnings(earningsResponse.data);
        } else {
          setError(earningsResponse.error || 'Failed to fetch earnings data');
        }
        
        if (performanceResponse.data) {
          setPerformance(performanceResponse.data);
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, period]);

  const getGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatGrowthRate = (rate: number) => {
    const isPositive = rate >= 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingUp className="h-4 w-4 mr-1 transform rotate-180" />}
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
            <p className="text-gray-600">Loading earnings data...</p>
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
              <h1 className="text-2xl font-bold">Earnings & Performance</h1>
              <p className="text-gray-600">Track your income and estimate future earnings</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Analysis Period:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'earnings', label: 'Earnings', icon: DollarSign },
              { id: 'performance', label: 'Performance', icon: Target },
              { id: 'projects', label: 'Projects', icon: Briefcase }
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

        {earnings && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Current Month vs Last Month */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Comparison</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Current Month</h3>
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Earned:</span>
                          <span className="font-semibold">{formatCurrency(earnings.currentMonth.total_earned)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Milestones:</span>
                          <span className="font-semibold">{earnings.currentMonth.milestone_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Paid:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(earnings.currentMonth.paid_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending:</span>
                          <span className="font-semibold text-yellow-600">{formatCurrency(earnings.currentMonth.pending_amount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Last Month</h3>
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Earned:</span>
                          <span className="font-semibold">{formatCurrency(earnings.lastMonth.total_earned)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Milestones:</span>
                          <span className="font-semibold">{earnings.lastMonth.milestone_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Paid:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(earnings.lastMonth.paid_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Growth:</span>
                          <span>{formatGrowthRate(getGrowthRate(earnings.currentMonth.total_earned, earnings.lastMonth.total_earned))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings Estimates */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings Estimates</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Avg Daily Earnings</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(earnings.estimates.avgDailyEarnings)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Target className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Est. Monthly Earnings</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(earnings.estimates.estimatedMonthlyEarnings)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {earnings.estimates.completionRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fiat Rewards */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiat Rewards</h2>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.fiatRewards.total_earned)}</div>
                        <div className="text-sm text-gray-600">Total Earned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(earnings.fiatRewards.paid_amount)}</div>
                        <div className="text-sm text-gray-600">Paid</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{formatCurrency(earnings.fiatRewards.pending_amount)}</div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{earnings.fiatRewards.reward_count}</div>
                        <div className="text-sm text-gray-600">Rewards</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming Payments */}
                {earnings.upcomingPayments.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Payments</h2>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="space-y-4">
                        {earnings.upcomingPayments.slice(0, 5).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{payment.title}</h4>
                              <p className="text-sm text-gray-600">{payment.project_title}</p>
                              {payment.due_date && (
                                <p className="text-xs text-gray-500">Due: {formatDate(payment.due_date)}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Earnings Breakdown</h2>
                
                {/* Period Summary */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Last {earnings.period.days} Days</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.period.total_earned)}</div>
                      <div className="text-sm text-gray-600">Total Earned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(earnings.period.paid_amount)}</div>
                      <div className="text-sm text-gray-600">Paid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{formatCurrency(earnings.period.pending_amount)}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{earnings.period.milestone_count}</div>
                      <div className="text-sm text-gray-600">Milestones</div>
                    </div>
                  </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Earnings Trend</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Earned
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payments
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {earnings.monthlyTrend.map((trend, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(trend.total_earned)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {trend.payment_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(trend.paid_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && performance && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
                
                {/* Project Performance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Projects</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {performance.projects.total_projects}
                        </p>
                        <p className="text-sm text-gray-500">
                          {performance.projects.completed_projects} completed
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Target className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {performance.proposals.successRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500">
                          {performance.proposals.accepted_proposals}/{performance.proposals.total_proposals} proposals
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {performance.milestones.avgCompletionDays.toFixed(1)} days
                        </p>
                        <p className="text-sm text-gray-500">
                          {performance.milestones.completed_count} milestones
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Communication & Satisfaction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Communication</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Messages:</span>
                        <span className="font-semibold">{performance.communication.total_messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversations:</span>
                        <span className="font-semibold">{performance.communication.conversations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Response Time:</span>
                        <span className="font-semibold">{performance.communication.avg_response_hours.toFixed(1)} hours</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Client Satisfaction</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Rating:</span>
                        <span className="font-semibold flex items-center">
                          {performance.satisfaction.avg_rating.toFixed(1)}
                          <Star className="h-4 w-4 text-yellow-500 ml-1" />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reviews:</span>
                        <span className="font-semibold">{performance.satisfaction.review_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Skills */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Top Skills by Project Count</h3>
                  <div className="space-y-3">
                    {performance.skills.map((skill, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{skill.name}</h4>
                          <p className="text-sm text-gray-600">{skill.unique_projects} unique projects</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{skill.project_count}</div>
                          <div className="text-sm text-gray-500">projects</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Earnings by Project</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Earned
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payments
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pending
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {earnings.earningsByProject.map((project) => (
                          <tr key={project.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {project.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(project.total_earned)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {project.payment_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {formatCurrency(project.paid_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                              {formatCurrency(project.pending_amount)}
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