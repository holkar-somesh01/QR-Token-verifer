"use client";
import { useSession } from "next-auth/react";
import Scanner from "@/components/Scanner";
import Navbar from "@/components/Navbar";
import { Loader2, RefreshCw, Smartphone, TrendingUp, Users, Clock, CheckCircle, BarChart3, XCircle } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Command Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Operations Control</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scan <span className="text-slate-400">Command</span></h1>
            <p className="mt-2 text-slate-500 font-medium">Real-time surveillance of authentication event metrics.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/users" className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
              <Users className="mr-2 h-4 w-4 text-slate-400" />
              Manage Fleet
            </Link>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 text-slate-400 ${statsLoading ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-100 bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
            >
              <Smartphone className="mr-2 h-4 w-4 opacity-70" />
              {showScanner ? 'Deactivate Scanner' : 'Activate Scanner'}
            </button>
          </div>
        </div>

        {/* Scanner Modal Pop-up */}
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-500"
              onClick={() => setShowScanner(false)}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 ease-out border border-white/20 max-h-[90vh] flex flex-col">
              {/* Header with Close Button */}
              <div className="absolute top-4 right-4 z-[110]">
                <button
                  onClick={() => setShowScanner(false)}
                  className="h-10 w-10 rounded-full bg-slate-900/50 hover:bg-slate-900/80 text-white flex items-center justify-center transition-all active:scale-90 backdrop-blur-md border border-white/10"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Scanner />
              </div>
            </div>
          </div>
        )}

        {/* Executive Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Progress Overview */}
          <div className="col-span-1 md:col-span-2 official-card p-8 flex flex-col justify-between relative overflow-hidden group border-l-4 border-l-blue-600 bg-white">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
              <CheckCircle size={180} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg w-fit text-blue-700 border border-blue-100">
                  <TrendingUp size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Entry Saturation</span>
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <h3 className="text-5xl font-bold text-slate-900 tracking-tighter">
                  {stats?.scannedCount || 0}
                </h3>
                <span className="text-xl text-slate-300 font-bold tracking-tight">/ {stats?.total || 0} UNITS</span>
              </div>
              <p className="text-slate-500 mt-2 font-semibold uppercase text-xs tracking-widest">Total Verified Attendance</p>
            </div>

            <div className="mt-12 relative z-10">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                <span>System Fill Rate</span>
                <span className="text-blue-600">{progress.toFixed(1)}%</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-6">
            <div className="official-card p-6 flex items-center gap-5 hover:translate-x-1 group bg-white">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Database Population</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tighter">{stats?.total || 0}</p>
              </div>
            </div>

            <div className="official-card p-6 flex items-center gap-5 hover:translate-x-1 group bg-white">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <BarChart3 size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Coded Token Assets</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tighter">{stats?.qrs || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Ledger */}
        <div className="official-card overflow-hidden bg-white shadow-xl shadow-slate-200/50 border-slate-100">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Activity Ledger</h3>
              <p className="text-xs text-slate-400 font-medium">Most recent authentication events across the network.</p>
            </div>
            <Link href="/attendance" className="inline-flex items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-slate-200">
              View Full Logs
            </Link>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            {(!stats?.recent || stats.recent.length === 0) ? (
              <div className="p-24 text-center text-slate-300 flex flex-col items-center">
                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                  <Clock size={24} className="text-slate-200" />
                </div>
                <p className="font-bold text-slate-900">Ledger Standby</p>
                <p className="text-xs text-slate-400 mt-1">Listening for incoming authentication telemetry...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-[0.2em] bg-slate-50/30">
                    <th className="px-8 py-5 font-bold">Authorized Entity</th>
                    <th className="px-8 py-5 font-bold">Identifier</th>
                    <th className="px-8 py-5 font-bold">Verification Time</th>
                    <th className="px-8 py-5 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recent.map((log: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all overflow-hidden relative">
                            {log.name.charAt(0)}
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-transparent opacity-20"></div>
                          </div>
                          <span className="font-bold text-slate-900 tracking-tight">{log.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-[11px] uppercase tracking-widest font-mono text-slate-400">{log.id}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700">
                            {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Verified
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
