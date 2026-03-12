"use client";
import { useSession } from "next-auth/react";
import Scanner from "@/components/Scanner";
import Navbar from "@/components/Navbar";
import { Loader2, RefreshCw, Smartphone, TrendingUp, Users, Clock, CheckCircle, BarChart3, XCircle, Coffee, Utensils, Zap } from "lucide-react";
import { useState } from "react";
import { useGetStatsQuery } from "@/lib/features/apiSlice";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const [showScanner, setShowScanner] = useState(false);

  const { data: apiData, isLoading: statsLoading, refetch } = useGetStatsQuery(undefined, {
    pollingInterval: 2000,
    skip: !session
  });

  if (status === "loading") return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors"><Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" /></div>;

  if (!session) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const totals = apiData?.stats || {};
  const recent = apiData?.recentScans || [];
  const registered = totals.totalRegistered || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden transition-colors duration-300">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Command Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Event Food Matrix</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Meal <span className="text-slate-400 dark:text-slate-600">Distribution</span></h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium italic">Monitoring 2-day sequential food scan telemetry.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/users" className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <Users size={14} className="mr-2" />
              Participants
            </Link>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="inline-flex items-center justify-center px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Smartphone size={14} className="mr-2" />
              Launch Scanner
            </button>
          </div>
        </div>

        {/* Floating Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
             <button onClick={() => setShowScanner(false)} className="absolute top-6 right-6 z-[120] text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                <XCircle size={48} strokeWidth={1} />
             </button>
             <div className="w-full h-full overflow-hidden">
                <Scanner />
             </div>
          </div>
        )}

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard label="Registered" value={registered} icon={<Users size={20} />} sub="Participants" color="blue" />
          <StatCard label="D1 Breakfast" value={totals.day1Breakfast} total={registered} icon={<Coffee size={20} />} color="emerald" />
          <StatCard label="D1 Lunch" value={totals.day1Lunch} total={registered} icon={<Utensils size={20} />} color="amber" />
          <StatCard label="D2 Breakfast" value={totals.day2Breakfast} total={registered} icon={<Coffee size={20} />} color="indigo" />
          <StatCard label="D2 Lunch" value={totals.day2Lunch} total={registered} icon={<Utensils size={20} />} color="rose" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Feed */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Live Scan Pulse</h3>
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        <span className="text-[10px] font-bold uppercase text-blue-500">Real-time Stream</span>
                    </div>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {recent.length === 0 ? (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center">
                            <Zap size={40} className="mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Waiting for Scans...</p>
                        </div>
                    ) : (
                        recent.map((s: any, i: number) => (
                            <div key={i} className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold">
                                        {s.userName?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{s.userName}</p>
                                        <p className="text-[10px] text-slate-500 font-mono italic">{s.expoId || 'no_id'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400">{s.mealType}</p>
                                    <p className="text-[10px] text-slate-400">{new Date(s.scanTime).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 text-center border-t border-slate-50 dark:border-slate-800">
                    <Link href="/attendance" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">View Master Audit Logs</Link>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                     <TrendingUp className="absolute top-[-20px] right-[-20px] size-40 opacity-10 group-hover:scale-110 transition-transform" />
                     <h4 className="text-[10px] font-black uppercase tracking-[.3em] mb-4 opacity-70">Efficiency Rate</h4>
                     <p className="text-4xl font-black mb-2 tracking-tighter">
                        {registered > 0 ? ((totals.day1Breakfast / registered) * 100).toFixed(1) : 0}%
                     </p>
                     <p className="text-xs font-medium opacity-80">Saturation of Day 1 Breakfast distribution against total registered users.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-[.3em] mb-6 text-slate-400">Day 2 Outlook</h4>
                    <div className="space-y-4">
                        <MiniProgress label="D2 Breakfast" value={totals.day2Breakfast} total={registered} color="indigo" />
                        <MiniProgress label="D2 Lunch" value={totals.day2Lunch} total={registered} color="rose" />
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, total, icon, color }: any) {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    }
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl transition-all hover:translate-y-[-4px]">
            <div className={`p-3 rounded-2xl w-fit mb-6 border ${colors[color]}`}>
                {icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value || 0}</h3>
                {total && <span className="text-xs text-slate-400 font-bold">/ {total}</span>}
            </div>
        </div>
    )
}

function MiniProgress({ label, value, total, color }: any) {
    const progress = total > 0 ? (value / total) * 100 : 0;
    const colors: any = {
        indigo: "bg-indigo-500",
        rose: "bg-rose-500"
    }
    return (
        <div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-900 dark:text-white">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${colors[color]} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    )
}
