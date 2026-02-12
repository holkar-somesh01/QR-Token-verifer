"use client";
import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { useGetUsersQuery, useImportUsersMutation, useGenerateQRsMutation, useSendQRViaEmailMutation, useSendBulkEmailsMutation, useAddUserMutation, useUpdateUserMutation, useDeleteUserMutation } from '@/lib/features/apiSlice';
import { useSession } from 'next-auth/react';
import { Loader2, Upload, QrCode, Download, Search, CheckCircle, XCircle, FileSpreadsheet, RefreshCw, Mail, MessageSquare, ExternalLink, LayoutGrid, Table as TableIcon, MoreVertical, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Plus, Pencil, Trash2, X } from 'lucide-react';
import Image from 'next/image';

export default function UsersPage() {
    const { data: session } = useSession();
    const { data: users, isLoading, refetch } = useGetUsersQuery();
    const [importUsers, { isLoading: isImporting }] = useImportUsersMutation();
    const [generateQRs, { isLoading: isGenerating }] = useGenerateQRsMutation();
    const [sendEmail, { isLoading: isSendingEmail }] = useSendQRViaEmailMutation();
    const [sendBulkEmails, { isLoading: isSendingBulk }] = useSendBulkEmailsMutation();
    const [addUser, { isLoading: isAdding }] = useAddUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        studentId: '',
        email: '',
        mobile: '',
        class: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // Student IDs

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Data & Ops
    const [file, setFile] = useState<File | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Pagination & Sort
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(12);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'fullName', direction: 'asc' });

    // Default to grid on mobile
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setViewMode('grid');
        }
    }, []);

    // Process users: filter and sort
    const processedUsers = useMemo(() => {
        if (!users) return [];

        let filtered = users.filter((user: any) =>
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.class && user.class.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Sorting
        const sorted = [...filtered].sort((a, b) => {
            const valA = (a[sortConfig.key] || '').toString().toLowerCase();
            const valB = (b[sortConfig.key] || '').toString().toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [users, searchTerm, sortConfig]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedUsers.slice(startIndex, startIndex + rowsPerPage);
    }, [processedUsers, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(processedUsers.length / rowsPerPage);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://qr-token-verifer-server.vercel.app/api";
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

    const handleSendBulkEmail = async () => {
        const targetIds = selectedUsers.length > 0 ? selectedUsers : 'all';
        const message = targetIds === 'all'
            ? "Send QR codes via email to ALL users with an email address?"
            : `Send QR codes to ${selectedUsers.length} selected users?`;

        if (!confirm(message)) return;

        try {
            const result = await sendBulkEmails({ userIds: targetIds }).unwrap();
            alert(result.message || 'Emails dispatched successfully!');
        } catch (err: any) {
            alert('Failed to send emails: ' + (err.data?.error || err.message));
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
        if (selectedUsers.length === processedUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(processedUsers.map((u: any) => u.studentId));
        }
    };

    const handleOpenAddUser = () => {
        setEditingUser(null);
        setFormData({ fullName: '', studentId: '', email: '', mobile: '', class: '' });
        setIsUserModalOpen(true);
    };

    const handleOpenEditUser = (user: any) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName || '',
            studentId: user.studentId || '',
            email: user.email || '',
            mobile: user.mobile || '',
            class: user.class || ''
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateUser({ id: editingUser.id, ...formData }).unwrap();
                alert('User updated successfully');
            } else {
                await addUser(formData).unwrap();
                alert('User created successfully');
            }
            setIsUserModalOpen(false);
            refetch();
        } catch (err: any) {
            alert(`Error: ${err.data?.error || err.message}`);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            await deleteUser({ id }).unwrap();
            refetch();
        } catch (err: any) {
            alert(`Delete failed: ${err.data?.error || err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50">

            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entity <span className="text-slate-400">Database</span></h1>
                        <p className="mt-1 text-sm text-slate-500 font-medium tracking-tight">Provision secure tokens and monitor personnel authorization protocols.</p>
                    </div>
                </div>

                {/* Unified Action Bar */}
                <div className="official-card bg-white p-2.5 flex flex-col xl:flex-row items-center gap-3 shadow-xl shadow-slate-200/40">
                    <div className="flex w-full xl:w-auto gap-2">
                        <button
                            onClick={handleOpenAddUser}
                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-wider"
                        >
                            <Plus className="mr-2 h-4 w-4 text-slate-500" />
                            Add Entity
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-wider"
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                            Import Assets
                        </button>
                        <button
                            onClick={() => handleGenerateQR(selectedUsers.length > 0 ? selectedUsers : 'all')}
                            disabled={isGenerating}
                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-wider"
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4 text-blue-400" />}
                            Issue Tokens
                        </button>
                        <button
                            onClick={handleSendBulkEmail}
                            disabled={isSendingBulk}
                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 uppercase tracking-wider"
                        >
                            {isSendingBulk ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4 text-blue-100" />}
                            Dispatch Emails
                        </button>
                    </div>

                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            className="w-full pl-11 pr-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                            placeholder="Find records by name, ID or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex w-full xl:w-auto items-center gap-3">
                        <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <TableIcon size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                        </div>

                        <button
                            onClick={handleDownloadQR}
                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider"
                        >
                            <Download className="mr-2 h-4 w-4 text-blue-500" />
                            Download ZIP
                        </button>
                    </div>
                </div>

                {/* Selected Count Indicator */}
                {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 animate-in slide-in-from-left-4 duration-300 max-w-fit">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Selected Entities:</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold leading-none">{selectedUsers.length}</span>
                        <button onClick={() => setSelectedUsers([])} className="ml-2 hover:opacity-70">
                            <XCircle size={14} />
                        </button>
                    </div>
                )}

                {/* Content Block */}
                <div className="official-card bg-white overflow-hidden shadow-2xl shadow-slate-200/50 border-slate-100">
                    <div className="min-h-[600px] flex flex-col">
                        {processedUsers.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
                                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 group">
                                    <Search className="h-6 w-6 text-slate-200" />
                                </div>
                                <p className="font-bold text-slate-900">Query Resulted in Zero Matches</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs transition-opacity">No database objects found corresponding to your current filter state.</p>
                            </div>
                        ) : viewMode === 'table' ? (
                            <div className="overflow-x-auto custom-scrollbar flex-1">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-50/30 border-b border-slate-100">
                                            <th scope="col" className="pl-8 pr-4 py-5 w-12">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                                    onChange={selectAll}
                                                    checked={processedUsers.length > 0 && selectedUsers.length === processedUsers.length}
                                                />
                                            </th>
                                            <th
                                                onClick={() => handleSort('studentId')}
                                                scope="col"
                                                className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-blue-600 transition-colors"
                                            >
                                                Identifier {sortConfig.key === 'studentId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                onClick={() => handleSort('fullName')}
                                                scope="col"
                                                className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-blue-600 transition-colors"
                                            >
                                                Personnel Identity {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                onClick={() => handleSort('class')}
                                                scope="col"
                                                className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-blue-600 transition-colors"
                                            >
                                                Department {sortConfig.key === 'class' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th scope="col" className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Protocol Status</th>
                                            <th scope="col" className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right pr-8">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedUsers.map((user: any) => (
                                            <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedUsers.includes(user.studentId) ? 'bg-blue-50/20' : ''}`}>
                                                <td className="pl-8 pr-4 py-6">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                                        checked={selectedUsers.includes(user.studentId)}
                                                        onChange={() => toggleSelectUser(user.studentId)}
                                                    />
                                                </td>
                                                <td className="px-6 py-6 font-bold text-[11px] text-slate-400 tracking-widest font-mono uppercase">{user.studentId}</td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden relative group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                                                            {user.fullName.charAt(0)}
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-transparent opacity-20"></div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 tracking-tight">{user.fullName}</p>
                                                            <p className="text-[10px] font-medium text-slate-400 lowercase">{user.email || 'no_email_on_file'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 whitespace-nowrap">
                                                    {user.class ? (
                                                        <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200">{user.class}</span>
                                                    ) : <span className="text-slate-300 font-bold text-[10px] tracking-widest uppercase">Unassigned</span>}
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    {user.qrToken ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.qrStatus === 'used' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                            <span className={`h-1 w-1 rounded-full ${user.qrStatus === 'used' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                                            {user.qrStatus === 'used' ? 'Locked' : 'Issued'}
                                                        </span>
                                                    ) : <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Token Not Primed</span>}
                                                </td>
                                                <td className="px-6 py-6 text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {user.qrToken && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleSendEmail(user.id)}
                                                                    disabled={!user.email || (sendingId === user.id)}
                                                                    className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-20"
                                                                    title="Send via Email"
                                                                >
                                                                    {sendingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail size={16} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleWhatsApp(user.mobile, user)}
                                                                    disabled={!user.mobile}
                                                                    className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all disabled:opacity-20"
                                                                    title="Send via WhatsApp"
                                                                >
                                                                    <MessageSquare size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenEditUser(user)}
                                                            className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all"
                                                            title="Edit User"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            disabled={deletingId === user.id}
                                                            className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                                                            title="Delete User"
                                                        >
                                                            {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1">
                                {paginatedUsers.map((user: any) => (
                                    <div
                                        key={user.id}
                                        className={`group relative bg-white border border-slate-100 rounded-[2rem] p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1 ${selectedUsers.includes(user.studentId) ? 'ring-2 ring-blue-500 bg-blue-50/10' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                                checked={selectedUsers.includes(user.studentId)}
                                                onChange={() => toggleSelectUser(user.studentId)}
                                            />
                                            {user.qrToken ? (
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${user.qrStatus === 'used' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    {user.qrStatus === 'used' ? 'Locked' : 'Issued'}
                                                </span>
                                            ) : (
                                                <span className="bg-slate-50 text-slate-300 border border-slate-100 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">Unprimed</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center text-center">
                                            <div className="relative mb-5 group-hover:scale-110 transition-transform duration-500">
                                                <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 text-2xl font-bold border border-slate-100 shadow-inner group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800 transition-all duration-500 overflow-hidden relative">
                                                    {user.fullName.charAt(0)}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent"></div>
                                                </div>
                                                {user.qrToken && (
                                                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-600 rounded-xl flex items-center justify-center border-2 border-white shadow-lg">
                                                        <CheckCircle size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1 tracking-tight group-hover:text-blue-600 transition-colors">{user.fullName}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mb-4 uppercase font-mono">{user.studentId}</p>

                                            {user.class && (
                                                <div className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 mb-4">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest line-clamp-1">{user.class}</span>
                                                </div>
                                            )}

                                            <p className="text-[11px] font-medium text-slate-400 truncate w-full mb-8 px-2 lowercase">{user.email || 'no_archive_available'}</p>
                                        </div>

                                        {user.qrToken ? (
                                            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                                                <button
                                                    onClick={() => handleSendEmail(user.id)}
                                                    disabled={!user.email || (sendingId === user.id)}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-bold bg-slate-50 text-slate-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 border border-slate-100 hover:border-blue-700 shadow-sm"
                                                >
                                                    {sendingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail size={14} />}
                                                    Email
                                                </button>
                                                <button
                                                    onClick={() => handleWhatsApp(user.mobile, user)}
                                                    disabled={!user.mobile}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-bold bg-slate-50 text-slate-600 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-30 border border-slate-100 hover:border-emerald-700 shadow-sm"
                                                >
                                                    <MessageSquare size={14} />
                                                    WhatsApp
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                                                <button
                                                    onClick={() => handleGenerateQR([user.studentId])}
                                                    disabled={isGenerating}
                                                    className="col-span-2 w-full py-3.5 rounded-2xl text-[11px] font-bold bg-slate-900 text-white hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 uppercase tracking-wider"
                                                >
                                                    Initialize Protocol
                                                </button>
                                            </div>
                                        )}

                                        {/* Edit/Delete Overlay */}
                                        <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                            <button
                                                onClick={() => handleOpenEditUser(user)}
                                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 flex items-center justify-center shadow-sm"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center shadow-sm"
                                            >
                                                {deletingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

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
                                        <option value={12}>12</option>
                                        <option value={24}>24</option>
                                        <option value={48}>48</option>
                                    </select>
                                    <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" />
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <span className="text-xs font-bold text-slate-500 tabular-nums">
                                    {processedUsers.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}-
                                    {Math.min(currentPage * rowsPerPage, processedUsers.length)} of {processedUsers.length}
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
                            <p className="text-sm text-gray-500 mt-1 font-medium">Upload an Excel (.xlsx) or CSV file with the required data structure.</p>
                        </div>
                        <form onSubmit={handleImport} className="space-y-4">
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                                <FileSpreadsheet className="h-10 w-10 text-slate-300 mb-3 group-hover:text-blue-500 transition-colors" />
                                <span className="text-sm font-semibold text-slate-600">{file ? file.name : "Click to select source file"}</span>
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                            <button type="submit" disabled={!file || isImporting} className="w-full inline-flex justify-center items-center px-4 py-3.5 border border-transparent text-sm font-bold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
                                {isImporting && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                                {isImporting ? 'Processing Data...' : 'Initiate Import'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 relative overflow-hidden ring-1 ring-white/20">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                            <Plus size={120} />
                        </div>

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {editingUser ? 'Update Entity' : 'New Entity'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    {editingUser ? 'Modify existing personnel record details.' : 'Manually provision a new user in the database.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="h-10 w-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-5 relative z-10">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Student ID</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. 2023001"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                        value={formData.studentId}
                                        onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="e.g. john@example.com"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Mobile Number</label>
                                    <input
                                        type="tel"
                                        placeholder="e.g. 9876543210"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                        value={formData.mobile}
                                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department / Class</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. BCA-I"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                        value={formData.class}
                                        onChange={e => setFormData({ ...formData, class: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsUserModalOpen(false)}
                                    className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding || isUpdating}
                                    className="flex-[2] px-6 py-3.5 rounded-xl text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    {(isAdding || isUpdating) && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingUser ? 'Save Modifications' : 'Provision User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
