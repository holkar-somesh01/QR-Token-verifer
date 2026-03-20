"use client";
import { useRouter } from 'next/navigation';
import { useGetScanHistoryQuery, useDeleteScanMutation } from "@/lib/features/apiSlice";
import { useSession } from "next-auth/react";
import { toast } from 'react-hot-toast';
import Navbar from "@/components/Navbar";
import { Loader2, Calendar, Clock, Search, Download, Filter, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Trash2, MoreHorizontal, CheckCircle, Copy, Utensils, Coffee, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";

export default function AttendancePage() {
    const { data: session, status: authStatus } = useSession();
    const { data: history, isLoading, refetch } = useGetScanHistoryQuery(undefined, {
        skip: !session
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [timeRange, setTimeRange] = useState("Last 30 days");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'scanTime', direction: 'desc' });

    const [deleteScan, { isLoading: isDeleting }] = useDeleteScanMutation();

    const handleDelete = async (scanId: string) => {
        if (confirm("Are you sure you want to permanently delete this scan record?")) {
            try {
                await deleteScan({ id: scanId }).unwrap();
                toast.success("Audit entry purged.");
                refetch();
            } catch (err: any) {
                toast.error("Wipe failed: " + (err.data?.error || err.message));
            }
        }
    };

    const availableFilters = useMemo(() => {
        if (!history) return [];
        const meals = new Set(history.map((item: any) => item.mealType));
        return Array.from(meals) as string[];
    }, [history]);

    const toggleFilter = (filter: string) => {
        setActiveFilters(prev =>
            prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
        );
        setCurrentPage(1);
    };

    const processedHistory = useMemo(() => {
        if (!history) return [];
        let filtered = history.filter((item: any) => {
            const matchesSearch =
                item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.expoId?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter = activeFilters.length === 0 || activeFilters.includes(item.mealType);
            return matchesSearch && matchesFilter;
        });

        return [...filtered].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [history, searchTerm, sortConfig, activeFilters]);

    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedHistory.slice(startIndex, startIndex + rowsPerPage);
    }, [processedHistory, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(processedHistory.length / rowsPerPage);

    if (authStatus === "loading" || isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    if (!session) {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden pb-20 transition-colors duration-300">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Scan <span className="text-slate-400">Master Ledger</span></h1>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Audit trail for all food distribution events.</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button onClick={() => refetch()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-500 transition-all hover:rotate-180 duration-500" title="Sync Ledger">
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => {
                            const csv = "Name,ExpoId,MealType,Time,ScannedBy\n" + processedHistory.map((h:any) => `"${h.userName}","${h.expoId}","${h.mealType}","${h.scanTime}","${h.scannedBy}"`).join("\n");
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'meal_logs.csv';
                            a.click();
                        }} className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            <Download size={14} /> <span className="sm:inline">Export CSV</span>
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by Participant..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
                         <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-xl ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-400'}`}><Filter size={18} /></button>
                         <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl ${viewMode === 'grid' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-400 text-sm font-black'}`}>Grid</button>
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2">
                    {availableFilters.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => toggleFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${activeFilters.includes(f) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
                    {viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                        <th className="px-8 py-5">Participant</th>
                                        <th className="px-8 py-5">Meal Type</th>
                                        <th className="px-8 py-5">Scan Trace</th>
                                        <th className="px-8 py-5">Operator</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {paginatedHistory.map((log: any) => (
                                        <tr key={log.scanId} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{log.userName}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 uppercase">{log.expoId || `#${log.scanId}`}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    {log.mealType.includes('Breakfast') ? <Coffee size={14} className="text-amber-500" /> : <Utensils size={14} className="text-blue-500" />}
                                                    <span className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-slate-200">{log.mealType}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(log.scanTime).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{new Date(log.scanTime).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{log.scannedBy}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button onClick={() => handleDelete(log.scanId)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-6 sm:p-8 gap-4 sm:gap-6">
                             {paginatedHistory.map((log: any) => (
                                <div key={log.scanId} className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 font-bold border border-slate-200 dark:border-slate-800 shadow-sm">{log.userName?.[0]}</div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{log.userName}</h3>
                                                <p className="text-[9px] font-mono text-slate-400 uppercase">{log.expoId || 'no_id'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(log.scanId)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                                                {log.mealType.includes('Breakfast') ? <Coffee size={12} /> : <Utensils size={12} />}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter text-slate-700 dark:text-slate-300">{log.mealType}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">{new Date(log.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-[8px] text-slate-400">{new Date(log.scanTime).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                             ))}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="p-6 sm:p-8 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/10">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                         <div className="flex gap-2">
                             <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 disabled:opacity-30" disabled={currentPage === 1}><ChevronLeft size={16} /></button>
                             <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 disabled:opacity-30" disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
