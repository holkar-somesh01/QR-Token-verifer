"use client";
import { useRouter } from 'next/navigation';
import { useGetScanHistoryQuery, useDeleteScanMutation } from "@/lib/features/apiSlice";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { Loader2, Calendar, Clock, Search, Download, Filter, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Settings, Trash2, MoreHorizontal, CheckCircle, Copy } from "lucide-react";
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
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'scannedAt', direction: 'desc' });

    // New Actions
    const router = useRouter();
    const [deleteScan, { isLoading: isDeleting }] = useDeleteScanMutation();

    const handleViewDetails = (studentId: string) => {
        // Navigate to Users page with search filter? OR just log for now?
        // Ideally: router.push(`/users?search=${studentId}`);
        // Let's assume the Users page handles query params? If not, maybe just copy ID.
        // Let's copy ID to clipboard for now as a safe default action.
        navigator.clipboard.writeText(studentId);
        alert(`Copied Student ID: ${studentId} to clipboard.`);
    };

    const handleDelete = async (scanId: string) => {
        if (confirm("Are you sure you want to permanently delete this scan record? This action cannot be undone.")) {
            try {
                await deleteScan({ id: scanId }).unwrap();
                alert("Record deleted successfully.");
                refetch();
            } catch (err: any) {
                alert("Failed to delete record: " + (err.data?.error || err.message));
            }
        }
    };

    // Derive available filters from data (unique classes/departments)
    const availableFilters = useMemo(() => {
        if (!history) return [];
        const classes = new Set(history.map((item: any) => item.userClass || "Unassigned"));
        return Array.from(classes) as string[];
    }, [history]);

    const toggleFilter = (filter: string) => {
        setActiveFilters(prev =>
            prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
        );
        setCurrentPage(1); // Reset to page 1 on filter change
    };

    const processedHistory = useMemo(() => {
        if (!history) return [];

        let filtered = history.filter((item: any) => {
            // 1. Text Search
            const matchesSearch =
                item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.studentId?.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. Time Range Filter
            const itemDate = new Date(item.scannedAt);
            const now = new Date();
            let matchesTime = true;

            if (timeRange === "Last 24 hours") {
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                matchesTime = itemDate >= oneDayAgo;
            } else if (timeRange === "Last 7 days") {
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesTime = itemDate >= sevenDaysAgo;
            } else if (timeRange === "Last 30 days") {
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesTime = itemDate >= thirtyDaysAgo;
            }

            // 3. Department Filters (Chips)
            const itemClass = item.userClass || "Unassigned";
            const matchesFilter = activeFilters.length === 0 || activeFilters.includes(itemClass);

            return matchesSearch && matchesTime && matchesFilter;
        });

        // Sorting
        const sorted = [...filtered].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [history, searchTerm, sortConfig, timeRange, activeFilters]);

    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedHistory.slice(startIndex, startIndex + rowsPerPage);
    }, [processedHistory, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(processedHistory.length / rowsPerPage);

    if (authStatus === "loading" || (authStatus === "authenticated" && isLoading)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!session) {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return null;
    }

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleExport = () => {
        const headers = ["Scan ID", "Student ID", "Name", "Class", "Scanned At", "Scanned By", "IP Address"];
        const rows = processedHistory.map((h: any) => [
            h.scanId,
            h.studentId,
            h.userName,
            h.userClass || "N/A",
            new Date(h.scannedAt).toLocaleString(),
            h.scannedBy || "System",
            h.ipAddress || "N/A"
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map((r: string[]) => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-x-hidden pb-20">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                {/* Header Section */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System <span className="text-slate-400">Attendance</span></h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Manage and audit institutional authentication events.</p>
                </div>

                {/* Primary Action Bar */}
                <div className="official-card bg-white p-2 flex flex-col md:flex-row items-center gap-3">
                    <div className="relative w-full md:w-auto">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 transition-all cursor-pointer w-full md:w-[180px]"
                        >
                            <option>Last 30 days</option>
                            <option>Last 7 days</option>
                            <option>Last 24 hours</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 group w-full md:w-auto ${showFilters || activeFilters.length > 0
                                ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <Filter size={16} className={`transition-transform ${showFilters ? 'rotate-180' : 'group-hover:rotate-12'}`} />
                        Filters
                        {activeFilters.length > 0 && (
                            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{activeFilters.length}</span>
                        )}
                    </button>

                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm w-full md:w-auto"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>

                {/* Filter Chips */}
                {showFilters && (
                    <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
                        {availableFilters.length > 0 ? availableFilters.map((filter, i) => (
                            <div
                                key={i}
                                onClick={() => toggleFilter(filter)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-bold cursor-pointer transition-colors ${activeFilters.includes(filter)
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                        : 'bg-blue-50/50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                    }`}
                            >
                                {filter}
                                {activeFilters.includes(filter) ? <CheckCircle size={10} /> : <MoreHorizontal size={10} />}
                            </div>
                        )) : (
                            <div className="text-[11px] text-slate-400 font-medium italic px-2">No department filters available</div>
                        )}
                    </div>
                )}

                {/* Main Table Container */}
                <div className="official-card bg-white overflow-hidden shadow-xl shadow-slate-200/50 border-slate-100">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/30">
                                    <th
                                        onClick={() => handleSort('userName')}
                                        className="pl-8 pr-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] cursor-pointer hover:text-blue-600 transition-colors"
                                    >
                                        Name {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        onClick={() => handleSort('userClass')}
                                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] cursor-pointer hover:text-blue-600 transition-colors"
                                    >
                                        Department / Class {sortConfig.key === 'userClass' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th
                                        onClick={() => handleSort('scannedAt')}
                                        className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] cursor-pointer hover:text-blue-600 transition-colors"
                                    >
                                        Log Date {sortConfig.key === 'scannedAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Device / IP</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Status</th>
                                    <th className="px-6 py-4 text-right pr-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                                                    <Clock size={24} className="text-slate-200" />
                                                </div>
                                                <p className="font-bold text-slate-900">No Records Found</p>
                                                <p className="text-xs text-slate-400 mt-1">Refine your search parameters to locate entry logs.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedHistory.map((log: any) => (
                                        <tr key={log.scanId} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="pl-8 pr-4 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 font-bold overflow-hidden relative group-hover:border-blue-200 transition-colors">
                                                        {log.userName?.charAt(0) || "U"}
                                                        {/* Avatar Placeholder Effect */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-transparent opacity-20"></div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 tracking-tight">{log.userName || "Unknown User"}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium tracking-tight">entity_id_{log.studentId || "000"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <p className="text-sm font-semibold text-slate-700 tracking-tight">{log.userClass || "General Sector"}</p>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-700">{new Date(log.scannedAt).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium font-mono">{new Date(log.scannedAt).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <p className="text-[10px] font-bold text-slate-500 bg-slate-100/50 px-2 py-1 rounded inline-block border border-slate-200/50 truncate max-w-[120px]">
                                                    {log.ipAddress || "Unknown"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    Verified
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 pr-8 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(log.studentId)}
                                                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                                                        title="Copy Student ID"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(log.scanId)}
                                                        disabled={isDeleting}
                                                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all disabled:opacity-50"
                                                        title="Delete Record"
                                                    >
                                                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/20">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500">Rows per page</span>
                            <div className="relative">
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition-all cursor-pointer min-w-[70px]"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" />
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-xs font-bold text-slate-500 tabular-nums">
                                {processedHistory.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}-
                                {Math.min(currentPage * rowsPerPage, processedHistory.length)} of {processedHistory.length}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-300 transition-all"
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-300 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-300 transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-300 transition-all"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
