"use client";
import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { useGetUsersQuery, useImportUsersMutation, useGenerateQRsMutation, useSendQRViaEmailMutation, useSendBulkEmailsMutation, useAddUserMutation, useUpdateUserMutation, useDeleteUserMutation, useImportGoogleSheetMutation } from '@/lib/features/apiSlice';
import { useSession } from 'next-auth/react';
import { Loader2, Upload, QrCode, Download, Search, CheckCircle, XCircle, FileSpreadsheet, Mail, MessageSquare, LayoutGrid, Table as TableIcon, Pencil, Trash2, X, Plus, Utensils, Coffee, UserCircle, ChevronLeft, ChevronRight, Globe, AlertTriangle, RefreshCw } from 'lucide-react';

export default function UsersPage() {
    const { data: session } = useSession();
    const { data: users, isLoading, refetch } = useGetUsersQuery();
    const [importUsers, { isLoading: isImporting }] = useImportUsersMutation();
    const [importGoogleSheet, { isLoading: isSyncingSheet }] = useImportGoogleSheetMutation();
    const [generateQRs, { isLoading: isGenerating }] = useGenerateQRsMutation();
    const [sendEmail, { isLoading: isSendingEmail }] = useSendQRViaEmailMutation();
    const [sendBulkEmails, { isLoading: isSendingBulk }] = useSendBulkEmailsMutation();
    const [addUser, { isLoading: isAdding }] = useAddUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

    const [isMounted, setIsMounted] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        expoId: '',
        participantType: 'normal',
        status: 'active',
        mealStatus: {
            day1Breakfast: 'not_used',
            day1Lunch: 'not_used',
            day2Breakfast: 'not_used',
            day2Lunch: 'not_used'
        }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    
    // Import States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importType, setImportType] = useState<'file' | 'gsheet'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [gsheetUrl, setGsheetUrl] = useState('');

    // Pagination & Sort
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(12);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // Email Templates
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    
    // Default professional template
    const DEFAULT_SUBJECT = "Action Required: Your Digital Access QR for {name}";
    const DEFAULT_BODY = `<h2>Welcome {name},</h2>
<p>Your official event registration is complete. Your unique <b>Access QR Code</b> is attached below.</p>
<p><b>Important Instructions:</b></p>
<ul>
  <li>Show this QR at the scanning desk for meal authentication.</li>
  <li>This code is registered to <b>{expoId}</b>.</li>
  <li>Keep it safe - digital or printed copy works.</li>
</ul>
<p>We look forward to seeing you at the event!</p>`;

    const [emailSubject, setEmailSubject] = useState(DEFAULT_SUBJECT);
    const [emailBody, setEmailBody] = useState(DEFAULT_BODY);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const processedUsers = useMemo(() => {
        if (!users) return [];
        let filtered = users.filter((user: any) =>
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.expoId?.toLowerCase().includes(searchTerm.toLowerCase())
        );
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

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (importType === 'file') {
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                await importUsers(fd).unwrap();
            } else {
                if (!gsheetUrl) return;
                await importGoogleSheet({ url: gsheetUrl }).unwrap();
            }
            alert('Personnel imported successfully!');
            setIsImportModalOpen(false);
            setFile(null);
            setGsheetUrl('');
            refetch();
        } catch (err: any) {
            alert('Import failed: ' + (err.data?.error || err.message));
        }
    };

    const handleGenerateQR = async (userIds: string[] | 'all') => {
        if (!confirm("Generate/Refresh QR IDs for selected users?")) return;
        try {
            await generateQRs({ userIds }).unwrap();
            alert('QR Codes provisioned.');
            refetch();
        } catch (err: any) {
            alert('Generation failed: ' + err.message);
        }
    };

    const handleDownloadQR = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://qr-token-verifer-server.vercel.app/api";
            const res = await fetch(`${apiUrl}/qr/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken}` }, // @ts-ignore
                body: JSON.stringify({ userIds: selectedUsers.length > 0 ? selectedUsers : 'all' })
            });
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrcodes_${Date.now()}.zip`;
            a.click();
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleOpenEditUser = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            expoId: user.expoId || '',
            participantType: user.participantType || 'normal',
            status: user.status || 'active',
            mealStatus: user.mealStatus || {
                day1Breakfast: 'not_used',
                day1Lunch: 'not_used',
                day2Breakfast: 'not_used',
                day2Lunch: 'not_used'
            }
        });
        setIsUserModalOpen(true);
    };

    const handleSendEmail = async (userId: string) => {
        try {
            await sendEmail({ 
                userId, 
                subject: emailSubject, 
                body: emailBody 
            }).unwrap();
            alert("QR Code sent to user's registered email.");
        } catch (err: any) {
            alert("Email failed: " + (err.data?.message || err.message));
        }
    };

    const handleSendBulk = async () => {
        if (!confirm(`Distribute QR Codes to ${selectedUsers.length > 0 ? selectedUsers.length : 'ALL'} participants via email?`)) return;
        try {
            await sendBulkEmails({ 
                userIds: selectedUsers.length > 0 ? selectedUsers : 'all',
                subject: emailSubject,
                body: emailBody
            }).unwrap();
            alert("Bulk distribution initiated.");
        } catch (err: any) {
            alert("Bulk failed: " + (err.data?.message || err.message));
        }
    };

    const handleToggleStatus = async (user: any) => {
        try {
            const newStatus = user.status === 'locked' ? 'active' : 'locked';
            await updateUser({ id: user.id, status: newStatus }).unwrap();
            refetch();
        } catch (err: any) {
            alert("Status toggle failed: " + err.message);
        }
    };

    const handleUpdateMeal = (mealKey: string, status: string) => {
        setFormData(prev => ({
            ...prev,
            mealStatus: { ...prev.mealStatus, [mealKey]: status }
        }));
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateUser({ id: editingUser.id, ...formData }).unwrap();
                alert('Updated successfully');
            } else {
                await addUser(formData).unwrap();
                alert('Participant created');
            }
            setIsUserModalOpen(false);
            refetch();
        } catch (err: any) {
            alert(`Error: ${err.data?.message || err.message}`);
        }
    };

    if (!isMounted || isLoading) return <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-950 transition-colors"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 transition-colors duration-300">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Participant <span className="text-slate-400">Registry</span></h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Manage personnel, meal privileges, and QR status.</p>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-[2rem] sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div className="grid grid-cols-2 lg:flex gap-2 sm:gap-3 w-full xl:w-auto">
                        <button onClick={() => { setEditingUser(null); setFormData({ name: '', email:'', expoId: '', participantType: 'normal', status: 'active', mealStatus: { day1Breakfast: 'not_used', day1Lunch: 'not_used', day2Breakfast: 'not_used', day2Lunch: 'not_used' } }); setIsUserModalOpen(true); }} className="px-3 sm:px-5 py-3 rounded-xl sm:rounded-2xl bg-slate-900 dark:bg-slate-800 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5 sm:gap-2">
                             <Plus size={12} className="sm:size-[14px]" /> <span className="truncate">Add User</span>
                        </button>
                        <button onClick={() => refetch()} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-500 transition-all hover:rotate-180 duration-500" title="Refresh User List">
                             <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-3 sm:px-5 py-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-slate-700 dark:text-slate-300">
                             <FileSpreadsheet size={12} className="text-emerald-500 sm:size-[14px]" /> <span className="truncate">Import</span>
                        </button>
                        <button onClick={() => handleGenerateQR(selectedUsers.length > 0 ? selectedUsers : 'all')} className="px-3 sm:px-5 py-3 rounded-xl sm:rounded-2xl bg-blue-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-blue-500/20">
                             <QrCode size={12} className="sm:size-[14px]" /> <span className="truncate">Issue QR</span>
                        </button>
                        <button onClick={() => handleSendBulk()} className="px-3 sm:px-5 py-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-slate-700 dark:text-slate-300">
                             <Mail size={12} className="text-blue-500 sm:size-[14px]" /> <span className="truncate">Invites</span>
                        </button>
                        <button onClick={() => setIsEmailModalOpen(true)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-500 transition-all" title="Email Settings">
                             <MessageSquare size={18} />
                        </button>
                    </div>
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search repository by name or expo_id..." className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewMode('table')} className={`p-3 rounded-xl ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-400'}`}><TableIcon size={18} /></button>
                        <button onClick={() => setViewMode('grid')} className={`p-3 rounded-xl ${viewMode === 'grid' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-400'}`}><LayoutGrid size={18} /></button>
                        <button onClick={handleDownloadQR} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-500 transition-all"><Download size={18} /></button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
                    {viewMode === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-950/30 text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                                        <th className="px-8 py-5">
                                             <input type="checkbox" onChange={() => setSelectedUsers(selectedUsers.length === processedUsers.length ? [] : processedUsers.map((u:any) => u.id))} checked={processedUsers.length > 0 && selectedUsers.length === processedUsers.length} />
                                        </th>
                                        <th className="px-8 py-5">Personnel</th>
                                        <th className="px-8 py-5">Type / Class</th>
                                        <th className="px-8 py-5">Meals Consumed</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {paginatedUsers.map((user: any) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-8 py-6">
                                                <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => setSelectedUsers(prev => prev.includes(user.id) ? prev.filter(x => x !== user.id) : [...prev, user.id])} />
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-400 uppercase">{user.name?.[0]}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-mono text-slate-400 uppercase">{user.expoId || 'no_id'}</p>
                                                            {user.email && <span className="text-[10px] text-blue-500 font-medium lowercase">({user.email})</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter inline-block ${user.participantType === 'poster' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {user.participantType}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex gap-1.5">
                                                    <MealPip status={user.mealStatus?.day1Breakfast} label="D1 B" />
                                                    <MealPip status={user.mealStatus?.day1Lunch} label="D1 L" />
                                                    {user.participantType !== 'poster' && (
                                                        <>
                                                            <MealPip status={user.mealStatus?.day2Breakfast} label="D2 B" />
                                                            <MealPip status={user.mealStatus?.day2Lunch} label="D2 L" />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleToggleStatus(user)} 
                                                        className={`p-2 rounded-lg transition-all ${user.status === 'locked' ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}
                                                        title={user.status === 'locked' ? "Unlock Token" : "Lock Token"}
                                                    >
                                                        {user.status === 'locked' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                                    </button>
                                                    <button onClick={() => handleOpenEditUser(user)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><Pencil size={14} /></button>
                                                    <button onClick={async () => { if(confirm("Delete?")) await deleteUser({id: user.id}); refetch(); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-8 gap-6">
                            {paginatedUsers.map((user: any) => (
                                <div key={user.id} className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:shadow-2xl transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                         <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 font-bold shadow-sm">{user.name?.[0]}</div>
                                         <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${user.participantType === 'poster' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{user.participantType}</div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{user.name}</h3>
                                    <div className="flex flex-col mb-6">
                                        <p className="text-[10px] font-mono text-slate-400 uppercase">{user.expoId || 'no_id'}</p>
                                        <p className="text-[10px] text-blue-500/70 font-medium lowercase truncate">{user.email || 'no email set'}</p>
                                    </div>
                                    <div className="flex gap-2 mb-6">
                                         <MealPip status={user.mealStatus?.day1Breakfast} label="D1B" />
                                         <MealPip status={user.mealStatus?.day1Lunch} label="D1L" />
                                         {user.participantType !== 'poster' && <MealPip status={user.mealStatus?.day2Breakfast} label="D2B" />}
                                         {user.participantType !== 'poster' && <MealPip status={user.mealStatus?.day2Lunch} label="D2L" />}
                                    </div>
                                    <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-800">
                                         <button onClick={() => handleOpenEditUser(user)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors">Configure Access</button>
                                         <button onClick={() => handleSendEmail(user.id)} className="p-2 text-slate-300 hover:text-blue-500"><Mail size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                         <div className="flex gap-2">
                             <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400"><ChevronLeft size={16} /></button>
                             <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400"><ChevronRight size={16} /></button>
                         </div>
                    </div>
                </div>
            </main>

            {/* Modal: Edit / Manual Overrides */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 border border-white/10 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{editingUser ? 'Manage Personnel' : 'New Entry'}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Manual attribute and privilege overrides.</p>
                            </div>
                            <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={32} strokeWidth={1} /></button>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-6 sm:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">FullName</label>
                                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold outline-none" placeholder="e.g. Somesh Holkar" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold outline-none" placeholder="e.g. user@gmail.com" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expo Identifier</label>
                                    <input required value={formData.expoId} onChange={e => setFormData({...formData, expoId: e.target.value})} className="w-full px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold outline-none" placeholder="EXPO-2026-X" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allocation Type</label>
                                    <div className="flex gap-3 sm:gap-4">
                                        {['normal', 'poster'].map(type => (
                                            <button key={type} type="button" onClick={() => setFormData({...formData, participantType: type})} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.participantType === type ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Status</label>
                                    <div className="flex gap-3 sm:gap-4">
                                        {[
                                            { id: 'active', label: 'Active', icon: CheckCircle, color: 'emerald' },
                                            { id: 'locked', label: 'Locked', icon: XCircle, color: 'rose' }
                                        ].map(st => (
                                            <button key={st.id} type="button" onClick={() => setFormData({...formData, status: st.id})} className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${formData.status === st.id ? (st.id === 'active' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600') : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                                                <st.icon size={12} className="sm:size-[14px]" />
                                                {st.label}
                                            </button>
                                        ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Privilege Status Overrides</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                     <MealStatusControl label="Day 1 Breakfast" status={formData.mealStatus.day1Breakfast} onToggle={(s) => handleUpdateMeal('day1Breakfast', s)} />
                                     <MealStatusControl label="Day 1 Lunch" status={formData.mealStatus.day1Lunch} onToggle={(s) => handleUpdateMeal('day1Lunch', s)} />
                                     {formData.participantType !== 'poster' && (
                                         <>
                                            <MealStatusControl label="Day 2 Breakfast" status={formData.mealStatus.day2Breakfast} onToggle={(s) => handleUpdateMeal('day2Breakfast', s)} />
                                            <MealStatusControl label="Day 2 Lunch" status={formData.mealStatus.day2Lunch} onToggle={(s) => handleUpdateMeal('day2Lunch', s)} />
                                         </>
                                     )}
                                </div>
                            </div>

                            <button type="submit" disabled={isUpdating || isAdding} className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3">
                                {isUpdating || isAdding ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                Commit Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Overlay */}
            {isImportModalOpen && (
                 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl">
                         <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold">Import Data</h3>
                            <button onClick={() => setIsImportModalOpen(false)}><X size={24} className="text-slate-400" /></button>
                         </div>
                         
                         <div className="flex gap-4 mb-8">
                             <button onClick={() => setImportType('file')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${importType === 'file' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-400'}`}>
                                 <FileSpreadsheet size={14} /> Excel/CSV
                             </button>
                             <button onClick={() => setImportType('gsheet')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${importType === 'gsheet' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-400'}`}>
                                 <Globe size={14} /> Google Sheets
                             </button>
                         </div>

                         {importType === 'file' ? (
                             <div className="relative h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 group hover:border-blue-500 transition-colors cursor-pointer mb-8">
                                <Upload size={32} className="text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{file ? file.name : 'Drop .xlsx or .csv source'}</span>
                                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                             </div>
                         ) : (
                             <div className="space-y-4 mb-8">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sheet Export Link</label>
                                 <div className="relative">
                                     <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                     <input 
                                        value={gsheetUrl} 
                                        onChange={e => setGsheetUrl(e.target.value)} 
                                        placeholder="Paste Public Link (e.g. docs.google.com/...)" 
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none" 
                                     />
                                 </div>
                                 <p className="text-[9px] text-slate-400 font-medium">Tip: Ensure the sheet is 'Public' or 'Anyone with link can view'. System will fetch headers like [Name, ExpoId, Email].</p>
                             </div>
                         )}

                         <div className="flex gap-3">
                             <button onClick={() => setIsImportModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                             <button onClick={handleImport} disabled={(importType === 'file' && !file) || (importType === 'gsheet' && !gsheetUrl) || isImporting || isSyncingSheet} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                                 {isImporting || isSyncingSheet ? <Loader2 className="animate-spin" size={14} /> : 'Execute Import'}
                             </button>
                         </div>
                    </div>
                 </div>
            )}
            {/* Email Settings Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border border-white/10 overflow-y-auto max-h-[95vh] custom-scrollbar">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Email Architect</h3>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Design the digital handshake for your participants.</p>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><XCircle size={28} className="sm:size-8" strokeWidth={1.5} /></button>
                        </div>

                        <div className="space-y-6 sm:space-y-8">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject Blueprint</label>
                                    <button 
                                        onClick={() => { setEmailSubject(DEFAULT_SUBJECT); setEmailBody(DEFAULT_BODY); }}
                                        className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:underline"
                                    >
                                        Restore Default
                                    </button>
                                </div>
                                <input 
                                    value={emailSubject} 
                                    onChange={e => setEmailSubject(e.target.value)}
                                    className="w-full px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                                    placeholder="e.g. Your Expo QR Code"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transmission Body (HTML)</label>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg font-black uppercase">{"{name}"}</span>
                                        <span className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-black uppercase">{"{expoId}"}</span>
                                    </div>
                                </div>
                                <textarea 
                                    value={emailBody} 
                                    onChange={e => setEmailBody(e.target.value)}
                                    rows={6}
                                    className="w-full px-5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm font-bold outline-none resize-none focus:border-blue-500 transition-all font-mono" 
                                    placeholder="Write your email content here..."
                                />
                            </div>

                            <div className="relative p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/20 rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20"></div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Virtual Output Preview
                                </p>
                                <div className="space-y-4">
                                    <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Subject</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{emailSubject.replace(/{name}/g, 'Somesh Holkar').replace(/{expoId}/g, 'EXPO-A101')}</p>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <div 
                                            className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: emailBody.replace(/{name}/g, 'Somesh Holkar').replace(/{expoId}/g, 'EXPO-A101') }} 
                                        />
                                    </div>
                                    <div className="mt-6 flex flex-col items-center gap-4 py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-900/50">
                                        <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300">
                                            <QrCode size={48} strokeWidth={1} />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Attached QR Identity</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => setIsEmailModalOpen(false)} className="order-2 sm:order-1 flex-1 py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-all">
                                    Dismiss
                                </button>
                                <button onClick={() => setIsEmailModalOpen(false)} className="order-1 sm:order-2 flex-[2] py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                                    Save Architecture
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MealPip({ status, label }: { status: string, label: string }) {
    const isUsed = status === 'used';
    return (
        <div className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 min-w-[32px] ${isUsed ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-40'}`}>
            <span className="text-[8px] font-black uppercase leading-none">{label}</span>
            {isUsed ? <CheckCircle size={10} /> : <div className="h-2 w-2 rounded-full border border-current" />}
        </div>
    )
}

function MealStatusControl({ label, status, onToggle }: { label: string, status: string, onToggle: (s: string) => void }) {
    const isUsed = status === 'used';
    return (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            <button type="button" onClick={() => onToggle(isUsed ? 'not_used' : 'used')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm transition-all ${isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                {isUsed ? 'Approved' : 'Pending'}
            </button>
        </div>
    )
}
