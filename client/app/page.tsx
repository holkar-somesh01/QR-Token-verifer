"use client";
import { useSession } from "next-auth/react";
import Scanner from "@/components/Scanner";
import Navbar from "@/components/Navbar";
import { Loader2, RefreshCw, Smartphone, TrendingUp, Users, Clock, CheckCircle, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useGetStatsQuery } from "@/lib/features/apiSlice";
import Link from "next/link"; // Import Link

export default function Home() {
  const { data: session, status } = useSession();
  const [showScanner, setShowScanner] = useState(false);

  // Using the updated getStats query that points to /qr/stats
  const { data: apiData, isLoading: statsLoading, refetch } = useGetStatsQuery(undefined, {
    pollingInterval: 5000,
    skip: !session
  });

  // Map new API response to component needs
  const stats = apiData ? {
    total: apiData.stats?.totalUsers || 0,
    qrs: apiData.stats?.totalQRs || 0,
    scannedCount: apiData.stats?.totalScans || 0,
    recent: apiData.recentScans?.map((s: any) => ({
      name: s.userName || 'Unknown',
      id: s.studentId || s.userId,
      time: s.scannedAt
    })) || []
  } : null;

  const handleRefresh = () => {
    refetch();
  };

  if (status === "loading") return <div className="flex h-screen w-full items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  if (!session) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const progress = stats && stats.total > 0 ? (stats.scannedCount / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Real-time overview of event attendance.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/users" className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Link>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              {showScanner ? 'Close Scanner' : 'Launch Scanner'}
            </button>
          </div>
        </div>

        {/* Scanner Expansion */}
        {showScanner && (
          <div className="animate-in slide-in-from-top-4 duration-500 ease-out">
            <div className="relative z-10 mx-auto max-w-2xl transform transition-all">
              <Scanner />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Progress Card */}
          <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle size={140} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg w-fit text-green-700">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Live Check-in Rate</span>
                </div>
              </div>

              <h3 className="text-5xl font-extrabold text-gray-900 tracking-tight mt-2">
                {stats?.scannedCount || 0}
                <span className="text-2xl text-gray-400 font-medium ml-2">/ {stats?.total || 0}</span>
              </h3>
              <p className="text-gray-500 mt-1 font-medium">Total Checked In</p>
            </div>

            <div className="mt-8 relative z-10">
              <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
                <span>Progress</span>
                <span className="text-blue-600">{progress.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Registered</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                <BarChart3 size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Generated QRs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.qrs || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            <Link href="/users" className="text-sm text-blue-600 font-medium hover:text-blue-700">View Users</Link>
          </div>

          <div className="overflow-x-auto">
            {(!stats?.recent || stats.recent.length === 0) ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Clock size={24} className="opacity-50" />
                </div>
                <p>No recent activity</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Guest</th>
                    <th className="px-6 py-4 font-semibold">ID</th>
                    <th className="px-6 py-4 font-semibold">Time</th>
                    <th className="px-6 py-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recent.map((log: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                            {log.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{log.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.id}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                          Checked In
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
