import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { getAllDonations, formatCurrency, type Donation } from '../lib/donations'
import { Navigate } from 'react-router-dom'

export default function AdminDonations() {
  const { user } = useAuth()
  const { role, isLoading: roleLoading } = useRole()
  const [donations, setDonations] = useState<Donation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Redirect if not admin
  if (!roleLoading && role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    loadDonations()
  }, [])

  const loadDonations = async () => {
    try {
      const result = await getAllDonations()
      if ('error' in result) {
        setError(result.error)
      } else {
        setDonations(result.donations)
      }
    } catch (error) {
      console.error('Error loading donations:', error)
      setError('Failed to load donations')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      initiated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
    return badges[status as keyof typeof badges] || badges.initiated
  }

  const getProviderBadge = (provider: string) => {
    const badges = {
      stripe: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      paypal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      manual: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    }
    return badges[provider as keyof typeof badges] || badges.pending
  }

  const getTotalStats = () => {
    const stats = donations.reduce((acc, donation) => {
      acc.total += donation.amount_cents
      acc.count += 1
      if (donation.status === 'paid') {
        acc.paidTotal += donation.amount_cents
        acc.paidCount += 1
      } else if (donation.status === 'initiated' && donation.provider === 'pending') {
        acc.pledgedTotal += donation.amount_cents
        acc.pledgedCount += 1
      }
      return acc
    }, {
      total: 0,
      count: 0,
      paidTotal: 0,
      paidCount: 0,
      pledgedTotal: 0,
      pledgedCount: 0
    })

    return stats
  }

  if (roleLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading donations...</p>
        </div>
      </div>
    )
  }

  const stats = getTotalStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Donations Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage platform donations and pledges
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Pledges
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {formatCurrency(stats.pledgedTotal)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.pledgedCount} pledges
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Paid
            </h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              {formatCurrency(stats.paidTotal)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.paidCount} payments
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              All Donations
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {formatCurrency(stats.total)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats.count} total
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Conversion Rate
            </h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {stats.count > 0 ? Math.round((stats.paidCount / stats.count) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              pledges to payments
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Donations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-200/60 dark:border-purple-700/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Donations & Pledges
            </h2>
          </div>

          {donations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No donations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(donation.amount_cents, donation.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(donation.status)}`}>
                          {donation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProviderBadge(donation.provider)}`}>
                          {donation.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {donation.user_id ? donation.user_id.slice(0, 8) + '...' : 'Anonymous'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {donation.message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}