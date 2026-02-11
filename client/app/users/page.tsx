"use client";
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useGetUsersQuery, useImportUsersMutation, useGenerateQRsMutation, useSendQRViaEmailMutation } from '@/lib/features/apiSlice';
import { useSession } from 'next-auth/react';
import { Loader2, Upload, QrCode, Download, Search, CheckCircle, XCircle, FileSpreadsheet, RefreshCw, Mail, MessageSquare, ExternalLink, LayoutGrid, Table as TableIcon, MoreVertical } from 'lucide-react';
import Image from 'next/image';

export default function UsersPage() {
    const { data: session } = useSession();
    const { data: users, isLoading, refetch } = useGetUsersQuery();
    const [importUsers, { isLoading: isImporting }] = useImportUsersMutation();
    const [generateQRs, { isLoading: isGenerating }] = useGenerateQRsMutation();
    const [sendEmail, { isLoading: isSendingEmail }] = useSendQRViaEmailMutation();

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // Student IDs
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Default to grid on mobile
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setViewMode('grid');
        }
    }, []);

    // Filter users
    const filteredUsers = users?.filter((user: any) =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            await importUsers(formData).unwrap();
            alert('Users imported successfully!');
            setIsImportModalOpen(false);
            setFile(null);
            refetch();
        } catch (err: any) {
            alert('Import failed: ' + (err.data?.error || err.message));
        }
    };

    const handleGenerateQR = async (userIds: string[] | 'all') => {
        const message = userIds === 'all'
            ? "Generate QR codes for ALL users? This will generate codes for users who don't have one yet."
            : `Generate QR codes for the ${userIds.length} selected users?`;

        if (!confirm(message)) return;
        try {
            await generateQRs({ userIds }).unwrap();
            alert('QR Codes generated successfully!');
            refetch();
        } catch (err: any) {
            alert('Generation failed: ' + err.message);
        }
    };

    const handleDownloadQR = async () => {
        if (selectedUsers.length === 0 && !confirm("Download ALL QR codes?")) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
            const res = await fetch(`${apiUrl}/qr/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}` // @ts-ignore
                },
                body: JSON.stringify({ userIds: selectedUsers.length > 0 ? selectedUsers : 'all' })
            });

            if (!res.ok) throw new Error("Download failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrcodes_${new Date().toISOString()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err: any) {
            alert("Error downloading QRs: " + err.message);
        }
    };

    const handleSendEmail = async (userId: string) => {
        setSendingId(userId);
        try {
            await sendEmail({ userId }).unwrap();
            alert(`Email sent successfully to user ID ${userId}`);
        } catch (err: any) {
            alert(`Failed to send email: ${err.data?.error || err.message}`);
        } finally {
            setSendingId(null);
        }
    };

    const handleWhatsApp = (mobile: string, user: any) => {
        if (!mobile) return alert("No mobile number for this user.");
        // Clean number
        const cleanNumber = mobile.replace(/[^0-9]/g, '');
        if (cleanNumber.length < 10) return alert("Invalid mobile number format.");

        const token = user.qrToken;
        if (!token) return alert("QR not generated for this user yet.");

        const qrLink = `${window.location.origin}/scan/${token}`;
        const message = encodeURIComponent(`Hello ${user.fullName}, here is your QR code link for the event: ${qrLink}\nPlease keep it safe.`);

        window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    };

    const toggleSelectUser = (id: string) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(selectedUsers.filter(uid => uid !== id));
        } else {
            setSelectedUsers([...selectedUsers, id]);
        }
    };

    const selectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map((u: any) => u.studentId));
        }
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage students, generate QRs, and track status.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                            Import Excel
                        </button>
                        <button
                            onClick={() => handleGenerateQR(selectedUsers.length > 0 ? selectedUsers : 'all')}
                            disabled={isGenerating}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <QrCode className="mr-2 h-4 w-4" />
                            {isGenerating ? 'Generating...' : 'Generate QRs'}
                        </button>
                        <button
                            onClick={handleDownloadQR}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Download className="mr-2 h-4 w-4 text-blue-600" />
                            Download ZIP
                        </button>
                    </div>
                </div>

                {/* Filters & Content Block */}
                <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
                    {/* Header: Search & View Toggle */}
                    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative max-w-sm w-full flex items-center gap-3">
                            <div className="relative w-full">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
                            <div className="text-sm text-gray-500 whitespace-nowrap">
                                {selectedUsers.length} selected
                            </div>

                            {/* View Toggle */}
                            <div className="flex items-center p-1 bg-gray-100 rounded-lg border border-gray-200">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-indigo-600 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                    title="Table View"
                                >
                                    <TableIcon size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-h-[500px] bg-gray-50/50">
                        {filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 h-full">
                                <div className="bg-gray-100 p-4 rounded-full mb-3">
                                    <Search className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-900">No users found</p>
                                <p className="text-sm">Try adjusting your search or import new users.</p>
                            </div>
                        ) : viewMode === 'table' ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    onChange={selectAll}
                                                    checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                                                />
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">QR Status</th>
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map((user: any) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedUsers.includes(user.studentId)}
                                                        onChange={() => toggleSelectUser(user.studentId)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.studentId}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">
                                                            {user.fullName.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">{user.fullName}</span>
                                                            <span className="text-xs text-gray-400">{user.email || 'No Email'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.class ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{user.class}</span>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {user.qrToken ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.qrStatus === 'used' ? 'bg-yellow-100 text-yellow-800' : user.qrStatus === 'expired' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                            {user.qrStatus === 'used' ? 'Scanned' : 'Ready'}
                                                        </span>
                                                    ) : <span className="text-xs text-gray-400 italic">Not Generated</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {user.qrToken && (
                                                            <>
                                                                <button onClick={() => handleSendEmail(user.id)} disabled={!user.email || (sendingId === user.id)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30">
                                                                    {sendingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail size={18} />}
                                                                </button>
                                                                <button onClick={() => handleWhatsApp(user.mobile, user)} disabled={!user.mobile} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30">
                                                                    <MessageSquare size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // Grid Views
                            <div className="p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredUsers.map((user: any) => (
                                    <div
                                        key={user.id}
                                        className={`group relative bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all ${selectedUsers.includes(user.studentId) ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200'}`}
                                    >
                                        <div className="p-4">
                                            {/* Top Row: checkbox and status */}
                                            <div className="flex items-start justify-between mb-3">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-5 w-5"
                                                    checked={selectedUsers.includes(user.studentId)}
                                                    onChange={() => toggleSelectUser(user.studentId)}
                                                />
                                                {user.qrToken ? (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${user.qrStatus === 'used' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                        {user.qrStatus || 'Ready'}
                                                    </span>
                                                ) : <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">No QR</span>}
                                            </div>

                                            {/* Avatar & Info */}
                                            <div className="flex flex-col items-center text-center">
                                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-indigo-700 text-xl font-bold mb-3 shadow-inner">
                                                    {user.fullName.charAt(0)}
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{user.fullName}</h3>
                                                <p className="text-sm text-gray-500 mb-1">{user.studentId}</p>
                                                {user.class && <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mb-3">{user.class}</span>}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-center gap-2 mt-2 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleSendEmail(user.id)}
                                                    disabled={!user.email || !user.qrToken || (sendingId === user.id)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-30"
                                                    title="Email QR"
                                                >
                                                    {sendingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleWhatsApp(user.mobile, user)}
                                                    disabled={!user.mobile || !user.qrToken}
                                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-30"
                                                    title="WhatsApp QR"
                                                >
                                                    <MessageSquare size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                        <button onClick={() => setIsImportModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <XCircle className="h-6 w-6" />
                        </button>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Import Users</h3>
                            <p className="text-sm text-gray-500 mt-1">Upload an Excel (.xlsx) or CSV file with columns: ID, Name, Email (optional).</p>
                        </div>
                        <form onSubmit={handleImport} className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                                <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-3" />
                                <span className="text-sm font-medium text-gray-600">{file ? file.name : "Click to select file"}</span>
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                            <button type="submit" disabled={!file || isImporting} className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all">
                                {isImporting && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                                {isImporting ? 'Importing...' : 'Upload & Import'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
