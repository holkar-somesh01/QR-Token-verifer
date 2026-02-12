"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGetQRDetailsQuery } from '@/lib/features/apiSlice';
import QRCode from 'qrcode';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import Image from 'next/image';

export default function ScanPage() {
    const params = useParams();
    const token = params?.token as string;

    // Skip query if no token
    const { data, isLoading, error } = useGetQRDetailsQuery(token, {
        skip: !token
    });

    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            // Generate QR code for the current URL (recusive-ish, but standard)
            // or just the token? The scanner logic handles both. 
            // Better to use the full URL so standard camera apps can also read it and open this page (if needed).
            // But for the Admin Scanner, it extracts token from /scan/ URI.
            const url = window.location.href;
            QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
                .then(url => setQrDataUrl(url))
                .catch(err => console.error(err));
        }
    }, [token]);

    if (!token) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-bold">Invalid Link Parameters</div>;

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Verifying Digital Token...</p>
            </div>
        );
    }

    if (error || !data?.valid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 shadow-xl shadow-rose-100/50">
                    <XCircle className="h-10 w-10 text-rose-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid or Expired Pass</h1>
                <p className="text-slate-500 max-w-xs mx-auto">This digital token is not recognized by the security mainframe. Please contact administration.</p>
            </div>
        );
    }

    const { user, status } = data;
    const isUsed = status === 'used';
    const isExpired = status === 'expired';

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                {/* ID Card Container */}
                <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-slate-200">

                    {/* Header Banner */}
                    <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <ShieldCheck className="text-blue-500 h-8 w-8 mb-3" />
                            <h2 className="text-white text-xs font-bold uppercase tracking-[0.3em]">Official Access Token</h2>
                        </div>
                        {/* Background Pattern */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-700 via-slate-900 to-black"></div>
                    </div>

                    {/* QR Section using cutout effect */}
                    <div className="relative -mt-10 mb-6 flex justify-center">
                        <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200">
                            {qrDataUrl ? (
                                <div className={`relative ${isUsed ? 'opacity-25 grayscale' : ''}`}>
                                    <Image
                                        src={qrDataUrl}
                                        alt="Access QR"
                                        width={200}
                                        height={200}
                                        className="rounded-xl"
                                    />
                                    {isUsed && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold border border-rose-200 uppercase tracking-wider transform -rotate-12 shadow-sm">
                                                Already Used
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[200px] w-[200px] bg-slate-100 rounded-xl flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Details */}
                    <div className="px-8 pb-10 text-center">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{user.fullName}</h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest font-mono mb-6">{user.studentId}</p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Department</p>
                                <p className="text-sm font-bold text-slate-700">{user.class || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
                                <div className={`inline-flex items-center gap-1.5 ${isUsed ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    <span className={`h-2 w-2 rounded-full ${isUsed ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
                                    <p className="text-sm font-bold">{isUsed ? 'Locked' : 'Active'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-[10px] text-slate-300 font-medium max-w-[200px] mx-auto leading-relaxed">
                            This digital pass is for authorized personnel only. Present this screen at the security checkpoint.
                        </div>
                    </div>

                    {/* Footer Status Bar */}
                    <div className={`h-2 w-full ${isUsed ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                </div>

                <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">© 2024 SecureCheck System</p>
                </div>
            </div>
        </div>
    );
}
