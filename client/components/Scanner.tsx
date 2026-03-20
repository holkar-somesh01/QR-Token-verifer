"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { Loader2, Camera, XCircle, CheckCircle, AlertTriangle, ScanLine, RotateCcw, History, Upload, User, Smartphone, Calendar, Hash, ArrowRight, RefreshCw } from "lucide-react";
import { useScanQRMutation, useGetQRDetailsQuery, useGetStatsQuery } from "@/lib/features/apiSlice";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Scanner() {
    const { data: session } = useSession();
    const [scannedId, setScannedId] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // API Hooks
    const { data: details, isLoading: detailsLoading, error: detailsError, refetch: refetchDetails } = useGetQRDetailsQuery(scannedId || "", {
        skip: !scannedId
    });
    const [approveScan, { isLoading: approveLoading }] = useScanQRMutation();
    const { refetch: refetchStats } = useGetStatsQuery();

    // Helper to scan file with jsQR
    const scanFileWithJsQR = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error("Canvas error")); return; }
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    if (code) resolve(code.data);
                    else reject(new Error("No QR found"));
                };
            };
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            startScanner();
        }, 500);
        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, []);

    const startScanner = async () => {
        if (scannerRef.current?.isScanning) return;
        try {
            setScanning(true);
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    handleDecodedToken(decodedText);
                },
                () => { }
            );
        } catch (err) {
            console.error(err);
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            await scannerRef.current.stop();
            scannerRef.current = null;
            setScanning(false);
        }
    };

    const handleDecodedToken = (token: string) => {
        // Extract ID if it's a URL or use as is
        let id = token;
        if (token.includes('/scan/')) {
            id = token.split('/scan/').pop()?.split('?')[0] || token;
        }
        setScannedId(id);
        stopScanner();
    };

    const handleApprove = async () => {
        if (!scannedId) return;
        try {
            await approveScan({
                token: scannedId,
                scannedBy: session?.user?.name || 'admin'
            }).unwrap();
            // Optional: You could add a temporary success state here
            resetScanner();
            refetchStats();
        } catch (err: any) {
            console.error("Approval failed:", err.data?.message);
            // Re-start scanner even on failure so it doesn't get stuck
            setTimeout(() => resetScanner(), 2000);
        }
    };

    const resetScanner = () => {
        setScannedId(null);
        startScanner();
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-950 relative overflow-hidden">
            {/* Immersive Background / Camera View */}
            <div className="absolute inset-0 z-0 bg-black">
                {!scannedId && (
                    <div id="reader" className="w-full h-full [&>video]:!object-cover [&>video]:!h-full [&>video]:!w-full" />
                )}
            </div>

            {/* Top Bar / Brand */}
            <div className="relative z-40 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                        <ScanLine size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-black uppercase tracking-tighter text-lg leading-none">Live <span className="text-blue-500">Scanner</span></h2>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">Sequential Sync Active</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (scannedId) refetchDetails();
                        refetchStats();
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all hover:rotate-180 duration-500"
                >
                    <RefreshCw size={18} className={(detailsLoading) ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Scanning Overlay (Central Focus) */}
            {!scannedId && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none p-4">
                    <div className="relative w-full max-w-[280px] aspect-square sm:w-72 sm:h-72">
                        {/* Corner Borders */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>

                        <div className="absolute inset-4 border border-white/10 rounded-xl overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/0 animate-scan relative">
                                <div className="absolute top-1/2 w-full h-[1px] bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
                            </div>
                        </div>
                    </div>
                    <p className="mt-8 text-white/60 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse text-center">Scanning for Participant Code</p>
                </div>
            )}

            {/* Floating Results Card */}
            {scannedId && details && (
                <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in slide-in-from-bottom-10 duration-500">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border-t sm:border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 text-center sm:text-left">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl bg-blue-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-2xl shadow-blue-500/40 shrink-0">
                                {details.user.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row items-center gap-2 mb-1">
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none truncate w-full sm:w-auto">{details.user.name}</h3>
                                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border shrink-0 ${details.user.participantType === 'poster' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {details.user.participantType}
                                    </div>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-widest">{details.user.expoId || `#${details.user.id}`}</p>
                            </div>
                        </div>

                        {details.user.status === 'locked' && (
                            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4 text-rose-500 animate-pulse">
                                <XCircle size={24} className="shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Access Revoked</p>
                                    <p className="text-[9px] sm:text-[10px] font-bold opacity-80">Locked by administration.</p>
                                </div>
                            </div>
                        )}

                        {details.warning && (
                            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 text-amber-500">
                                <AlertTriangle size={24} className="shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Sequence Advisory</p>
                                    <p className="text-[9px] sm:text-[10px] font-bold opacity-80">{details.warning}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5">
                                <p className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 sm:mb-3">Expected</p>
                                <p className={`text-sm sm:text-xl font-black uppercase tracking-tighter ${details.nextMeal === "All Meals Finished" ? "text-rose-500" : "text-blue-600"}`}>
                                    {details.nextMeal === "Day1 Breakfast" ? "D1 B-fast" :
                                        details.nextMeal === "Day1 Lunch" ? "D1 Lunch" :
                                            details.nextMeal === "Day2 Breakfast" ? "D2 B-fast" :
                                                details.nextMeal === "Day2 Lunch" ? "D2 Lunch" : details.nextMeal}
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5">
                                <p className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 sm:mb-3">Audit</p>
                                <p className="text-sm sm:text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                                    {details.scanCount}<span className="text-slate-300 dark:text-slate-700 mx-1">/</span>{details.user.participantType === 'poster' ? 2 : 4}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2 mb-8 h-28 sm:h-32 overflow-y-auto pr-2 custom-scrollbar">
                            <MealStatusRow label="Day 1 Breakfast" status={details.mealStatus.day1Breakfast} />
                            <MealStatusRow label="Day 1 Lunch" status={details.mealStatus.day1Lunch} />
                            {details.user.participantType !== 'poster' && (
                                <>
                                    <MealStatusRow label="Day 2 Breakfast" status={details.mealStatus.day2Breakfast} />
                                    <MealStatusRow label="Day 2 Lunch" status={details.mealStatus.day2Lunch} />
                                </>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={resetScanner} className="order-2 sm:order-1 flex-1 py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-all">
                                Dismiss
                            </button>
                            <button
                                disabled={details.nextMeal === "All Meals Finished" || details.user.status === 'locked' || details.isDateMismatch || approveLoading}
                                onClick={handleApprove}
                                className="order-1 sm:order-2 flex-[2] py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] sm:text-[10px] bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                            >
                                {approveLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {details.user.status === 'locked' ? 'Unauthorized' : 
                                 details.isDateMismatch ? 'Strict Block' : 'Approve Meal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Immersive Controls (Mobile Optimized Glassmorphism) */}
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3 w-max max-w-[90%] sm:max-w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-900/60 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl">
                <input
                    id="file-scan"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                        if (e.target.files?.[0]) {
                            try {
                                const token = await scanFileWithJsQR(e.target.files[0]);
                                handleDecodedToken(token);
                            } catch (err) {
                                alert("QR Code not detected.");
                            }
                        }
                    }}
                />
                <button onClick={() => document.getElementById('file-scan')?.click()} className="p-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-3xl transition-all" title="Scan Image">
                    <Upload size={20} />
                </button>
                <button onClick={() => scanning ? stopScanner() : startScanner()} className={`p-5 ${scanning ? 'bg-rose-500' : 'bg-blue-600'} text-white rounded-[2rem] shadow-xl transition-all hover:scale-105 active:scale-95`} title={scanning ? "Stop Camera" : "Start Camera"}>
                    {scanning ? <XCircle size={28} /> : <Camera size={28} />}
                </button>
                <Link href="/attendance" className="p-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-3xl transition-all" title="History">
                    <History size={20} />
                </Link>
            </div>

            {/* Syncing/Loading Overlay */}
            {detailsLoading && (
                <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full border-2 border-white/10 flex items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        </div>
                        <div className="absolute inset-0 h-20 w-20 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="mt-6 text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Vault Syncing...</p>
                </div>
            )}
        </div>
    );
}

function MealStatusRow({ label, status }: { label: string, status: string }) {
    const isUsed = status === 'used';
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{label}</span>
            <div className={`flex items-center gap-1.5 ${isUsed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                {isUsed ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
                <span className="text-[10px] font-bold uppercase tracking-tight">{isUsed ? 'Approved' : 'Pending'}</span>
            </div>
        </div>
    );
}
