"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import jsQR from "jsqr";
import { Loader2, Camera, XCircle, CheckCircle, AlertTriangle, ScanLine, RotateCcw, History } from "lucide-react";
import { useScanQRMutation, useGetStatsQuery } from "@/lib/features/apiSlice";
import Link from "next/link";

export default function Scanner() {
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // API Hooks
    const [scanQR] = useScanQRMutation();
    const { data: statsData, refetch: refetchStats } = useGetStatsQuery();

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
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) {
                        reject(new Error("Failed to get canvas context"));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const code = jsQR(imageData.data, width, height);

                    if (code) {
                        resolve(code.data);
                    } else {
                        reject(new Error("No QR code found"));
                    }
                };
                img.onerror = () => reject(new Error("Failed to load image"));
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
        });
    };

    useEffect(() => {
        // Auto-start scanner on mount
        const timer = setTimeout(() => {
            startScanner();
        }, 500);

        // Cleanup on unmount
        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanner = async () => {
        if (scannerRef.current?.isScanning) return;

        try {
            setScanning(true);
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    // Success callback
                    await handleScan(decodedText);
                },
                (errorMessage) => {
                    // Error callback - ignore frame errors
                }
            );
        } catch (err) {
            console.error("Error starting scanner:", err);
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                setScanning(false);
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    const handleScan = async (decodedText: string) => {
        if (loading) return;

        // Pause scanning
        if (scannerRef.current) {
            await scannerRef.current.pause();
        }

        setLoading(true);

        try {
            // Extract token from URL if it's a full URL
            let token = decodedText;
            if (decodedText.includes('/scan/')) {
                const parts = decodedText.split('/scan/');
                if (parts.length > 1) token = parts[1];
            }

            const data = await scanQR({ token, deviceId: navigator.userAgent }).unwrap();
            setScanResult(data);
            refetchStats(); // Refresh recent scans
        } catch (err: any) {
            setScanResult(err.data || { valid: false, message: "Network or Server Error" });
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = async () => {
        setScanResult(null);
        setLoading(false);
        if (scannerRef.current) {
            try {
                await scannerRef.current.resume();
            } catch (e) {
                // If resume fails (e.g. was stopped), restart
                stopScanner().then(startScanner);
            }
        } else {
            startScanner();
        }
    };

    // Helper to determine status color/icon
    const isSuccess = scanResult?.valid === true;
    const isWarning = scanResult?.message?.toLowerCase().includes('already used') || scanResult?.message?.toLowerCase().includes('terminated');
    const isError = !isSuccess && !isWarning;

    return (
        <div className="flex flex-col w-full">
            {/* Main Scanner Section */}
            <div className="w-full bg-slate-950 flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="px-4 py-4 sm:px-8 sm:py-6 flex items-center justify-between border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-wide uppercase">Security Scanner</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Active Cluster:</span>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded">Alpha-01</span>
                            </div>
                        </div>
                    </div>

                    {scanning && (
                        <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Signal Live</span>
                        </div>
                    )}
                </div>

                {/* Viewport Area */}
                <div className="relative aspect-square sm:aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {/* Camera Viewport */}
                    <div id="reader" className={`w-full h-full [&>video]:!object-cover ${scanResult ? 'opacity-20 blur-2xl scale-110' : 'opacity-100'} transition-all duration-700`} />

                    {/* Camera Guide Lines */}
                    {!scanResult && scanning && (
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                            <div className="relative w-48 h-48 sm:w-72 sm:h-72">
                                <div className="absolute top-0 left-0 w-16 h-16 border-t-[3px] border-l-[3px] border-blue-500 rounded-tl-3xl opacity-80 shadow-[-4px_-4px_10px_rgba(59,130,246,0.3)]"></div>
                                <div className="absolute top-0 right-0 w-16 h-16 border-t-[3px] border-r-[3px] border-blue-500 rounded-tr-3xl opacity-80 shadow-[4px_-4px_10px_rgba(59,130,246,0.3)]"></div>
                                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[3px] border-l-[3px] border-blue-500 rounded-bl-3xl opacity-80 shadow-[-4px_4px_10px_rgba(59,130,246,0.3)]"></div>
                                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[3px] border-r-[3px] border-blue-500 rounded-br-3xl opacity-80 shadow-[4px_4px_10px_rgba(59,130,246,0.3)]"></div>

                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan opacity-80 shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                            </div>

                            <div className="absolute bottom-10 px-6 py-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 text-white/80 text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3">
                                <ScanLine size={14} className="text-blue-500 animate-pulse" />
                                Optical Focus Required
                            </div>
                        </div>
                    )}

                    {/* Result Overlay */}
                    {scanResult && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-full max-w-sm flex flex-col items-center">
                                <div className={`mb-8 flex h-28 w-28 items-center justify-center rounded-[2.5rem] shadow-2xl transition-all border-2 ${isSuccess ? 'bg-blue-600 border-blue-400/50 text-white rotate-0' :
                                    isWarning ? 'bg-amber-500 border-amber-300/50 text-white rotate-12' :
                                        'bg-rose-600 border-rose-400/50 text-white -rotate-12'
                                    }`}>
                                    {isSuccess ? <CheckCircle size={56} strokeWidth={2.5} /> :
                                        isWarning ? <AlertTriangle size={56} strokeWidth={2.5} /> :
                                            <XCircle size={56} strokeWidth={2.5} />}
                                </div>

                                <div className="text-center mb-8">
                                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                                        {isSuccess ? 'Validated' :
                                            isWarning ? 'Duplicate Scan' : 'Auth Failed'}
                                    </h3>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mx-auto">
                                        {scanResult.message}
                                    </p>
                                </div>

                                {scanResult.user && (
                                    <div className="w-full mb-10 rounded-[2rem] bg-white/5 border border-white/10 p-6 backdrop-blur-xl shadow-inner">
                                        <div className="flex items-center gap-5 mb-5">
                                            <div className="h-14 w-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xl border border-blue-500/20">
                                                {scanResult.user.fullName?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-lg tracking-tight">{scanResult.user.fullName || scanResult.user.name}</p>
                                                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest font-mono mt-1">{scanResult.user.studentId || scanResult.user.id}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {scanResult.user.class && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 font-bold uppercase tracking-wider">Assigned Sector</span>
                                                    <span className="text-slate-200 font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{scanResult.user.class}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={resetScanner}
                                    className={`w-full rounded-2xl px-8 py-5 font-bold text-white transition-all active:scale-[0.97] flex items-center justify-center gap-4 shadow-2xl ${isSuccess ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30' :
                                        'bg-slate-800 hover:bg-slate-700 shadow-black/40'
                                        }`}
                                >
                                    <RotateCcw size={20} />
                                    Terminal Reset
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading Screen */}
                    {loading && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl animate-pulse"></div>
                                <Loader2 className="h-16 w-16 animate-spin text-blue-500 relative z-10" strokeWidth={3} />
                            </div>
                            <p className="mt-8 text-xs font-bold text-white uppercase tracking-[0.4em] animate-pulse">Handshaking Server</p>
                        </div>
                    )}
                </div>

                {/* Interaction Strip */}
                <div className="bg-slate-900 border-t border-white/5 p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
                    <label className="flex-1 flex items-center justify-center gap-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-[1.25rem] transition-all cursor-pointer border border-white/5 group active:scale-[0.98]">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    const file = e.target.files[0];
                                    setLoading(true);
                                    try {
                                        const decodedText = await scanFileWithJsQR(file);
                                        await handleScan(decodedText);
                                    } catch (err) {
                                        alert("Neural analysis failed. Please provide a clearer token capture.");
                                        startScanner();
                                    } finally {
                                        setLoading(false);
                                        e.target.value = '';
                                    }
                                }
                            }}
                        />
                        <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <ScanLine size={18} />
                        </div>
                        <span className="text-sm tracking-wide">Analysis: Optical File</span>
                    </label>
                    <button
                        onClick={() => scanning ? stopScanner() : startScanner()}
                        className={`px-8 py-4 rounded-[1.25rem] font-bold text-sm transition-all border ${scanning
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                            }`}
                    >
                        {scanning ? 'Kill Stream' : 'Boot Sensor'}
                    </button>
                </div>
            </div>

            {/* Audit Logs Section (Clean White) */}
            <div className="w-full bg-white">
                <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <History size={16} />
                        </div>
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Operational History</h3>
                    </div>
                    <Link href="/attendance" className="inline-flex items-center px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all">
                        Full Ledger
                    </Link>
                </div>

                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {statsData?.recentScans?.length > 0 ? (
                        statsData.recentScans.map((scan: any) => (
                            <div key={scan.scanId} className="px-4 py-4 sm:px-8 sm:py-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm border border-slate-100">
                                        {scan.userName?.[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 tracking-tight">{scan.userName || 'Generic Entity'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono mt-0.5">{scan.studentId || '#'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-900">{new Date(scan.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <div className="flex items-center justify-end gap-1.5 mt-1">
                                        <span className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Persistent</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-16 text-center flex flex-col items-center">
                            <div className="h-16 w-16 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-4 text-slate-200">
                                <History size={24} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">No Log Activity</p>
                        </div>
                    )}
                </div>
            </div>
        </div>


    );
}
