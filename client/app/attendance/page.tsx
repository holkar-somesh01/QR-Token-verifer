"use client";
import { useGetScanHistoryQuery } from "@/lib/features/apiSlice";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { Loader2, Calendar, Clock, User, Fingerprint, MapPin, Search, Download } from "lucide-react";
import { useState } from "react";

export default function AttendancePage() {
    const { data: session, status: authStatus } = useSession();
    const { data: history, isLoading, refetch } = useGetScanHistoryQuery(undefined, {
        skip: !session
    });
    const [searchTerm, setSearchTerm] = useState("");

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

    const filteredHistory = history?.filter((item: any) =>
        item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleExport = () => {
        const headers = ["Scan ID", "Student ID", "Name", "Class", "Scanned At", "Scanned By", "IP Address"];
        const rows = filteredHistory.map((h: any) => [
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
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance History</h1>
                        <p className="mt-1 text-sm text-gray-500">View and manage all QR scan logs.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50 text-xs text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                    <th className="px-6 py-4 font-semibold text-black">Guest / Student</th>
                                    <th className="px-6 py-4 font-semibold text-black">Info</th>
                                    <th className="px-6 py-4 font-semibold text-black">Scan Details</th>
                                    <th className="px-6 py-4 font-semibold text-black">Network</th>
                                    <th className="px-6 py-4 font-semibold text-black text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-black">
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                                    <Clock size={20} className="opacity-40" />
                                                </div>
                                                <p>No scan history found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((log: any) => (
                                        <tr key={log.scanId} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                                                        {log.userName?.charAt(0) || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{log.userName}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{log.studentId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1.5 text-gray-600">
                                                        <User size={12} className="text-gray-400" />
                                                        {log.userClass || "General"}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1.5 font-medium text-gray-900">
                                                        <Calendar size={12} className="text-blue-500" />
                                                        {new Date(log.scannedAt).toLocaleDateString()}
                                                    </p>
                                                    <p className="flex items-center gap-1.5 text-gray-500">
                                                        <Clock size={12} />
                                                        {new Date(log.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="space-y-1 text-gray-500">
                                                    <p className="flex items-center gap-1.5">
                                                        <MapPin size={10} />
                                                        IP: {log.ipAddress || "Unknown"}
                                                    </p>
                                                    <p className="flex items-center gap-1.5 truncate max-w-[150px]">
                                                        <Fingerprint size={10} />
                                                        {log.deviceInfo || "Web Browser"}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                    ✓ Success
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
