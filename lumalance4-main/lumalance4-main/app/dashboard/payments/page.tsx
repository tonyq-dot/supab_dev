'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import PaymentMethodForm from '@/components/PaymentMethodForm';

interface Payment {
  id: number;
  milestone_id: number;
  payer_id: number;
  payee_id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method_id: number | null;
  transaction_id: string | null;
  notes: string | null;
  paid_at: string | null;
  due_date: string | null;
  created_at: string;
  milestone_title: string;
  project_title: string;
  project_slug: string;
  payer_name: string;
  payee_name: string;
}

interface PaymentStats {
  total_payments: number;
  paid_payments: number;
  pending_payments: number;
  due_payments: number;
  total_paid: number;
  total_due: number;
  total_received: number;
  total_sent: number;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const paymentsPerPage = 20;

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/payments');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        
        if (filter !== 'all') {
          params.append('type', filter);
        }
        
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        
        params.append('limit', paymentsPerPage.toString());
        params.append('offset', ((currentPage - 1) * paymentsPerPage).toString());
        
        const [paymentsResponse, statsResponse] = await Promise.all([
          api.payments.getAll(params.toString()),
          api.payments.getStats()
        ]);
        
        if (paymentsResponse.data) {
          setPayments(paymentsResponse.data.payments);
          setTotalPayments(paymentsResponse.data.pagination.total);
        } else {
          setError(paymentsResponse.error || 'Failed to fetch payments');
        }
        
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, filter, statusFilter, currentPage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Due
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
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

  const getPaymentType = (payment: Payment) => {
    if (payment.payer_id === user?.id) {
      return 'sent';
    } else if (payment.payee_id === user?.id) {
      return 'received';
    }
    return 'unknown';
  };

  const totalPages = Math.ceil(totalPayments / paymentsPerPage);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-gray-600">Loading...</p>
                  </div>

        {/* Payment Methods Section */}
        <div className="mt-12">
          <PaymentMethodForm />
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
            <DollarSign className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold">Payments</h1>
              <p className="text-gray-600">Track your payment history and earnings</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.total_received || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.total_sent || 0)}
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
                    {formatCurrency(stats.total_due || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_payments || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center space-x-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as 'all' | 'sent' | 'received');
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Payments</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="due">Due</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600 mb-2"></div>
              <p className="text-gray-600">Loading payments...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You haven't made or received any payments yet."
                  : filter === 'sent'
                  ? "You haven't sent any payments yet."
                  : "You haven't received any payments yet."
                }
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {payment.milestone_title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(payment.status)}
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            Project: {payment.project_title}
                          </span>
                          <span>
                            {getPaymentType(payment) === 'sent' ? 'To: ' : 'From: '}
                            {getPaymentType(payment) === 'sent' ? payment.payee_name : payment.payer_name}
                          </span>
                          <span>
                            {payment.paid_at ? `Paid: ${formatDate(payment.paid_at)}` : `Due: ${formatDate(payment.due_date || payment.created_at)}`}
                          </span>
                        </div>
                        
                        {payment.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            Note: {payment.notes}
                          </p>
                        )}
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
                      Showing {((currentPage - 1) * paymentsPerPage) + 1} to{' '}
                      {Math.min(currentPage * paymentsPerPage, totalPayments)} of{' '}
                      {totalPayments} payments
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
      </div>
    </DashboardLayout>
  );
} 