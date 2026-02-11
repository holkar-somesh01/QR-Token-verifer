"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import jsQR from "jsqr";
import { Loader2, Camera, XCircle, CheckCircle, AlertTriangle, ScanLine, RotateCcw, History } from "lucide-react";
import { useScanQRMutation, useGetStatsQuery } from "@/lib/features/apiSlice";

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
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
            {/* Main Scanner Card */}
            <div className="w-full max-w-lg mx-auto overflow-hidden bg-black rounded-3xl shadow-2xl ring-1 ring-gray-900/5 relative">
                {/* Header */}
                <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <Camera size={20} className="text-blue-500" />
                        <h2 className="font-semibold tracking-wide">QR Check-in</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {scanning ? (
                            <>
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="text-xs font-medium text-gray-400">Live Camera</span>
                            </>
                        ) : (
                            <span className="text-xs font-medium text-gray-500">Camera Off</span>
                        )}
                    </div>
                </div>

                <div className="relative min-h-[350px] bg-black flex flex-col items-center justify-center">

                    {/* Camera Viewport */}
                    <div id="reader" className={`w-full h-full [&>video]:!object-cover [&>video]:!rounded-lg ${scanResult ? 'opacity-20 blur-sm' : 'opacity-100'}`} />

                    {/* Start/Stop Controls (if needed) */}
                    {!scanning && !scanResult && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                            <button
                                onClick={startScanner}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Camera size={20} />
                                Open Camera
                            </button>
                        </div>
                    )}

                    {/* Result Overlay */}
                    {scanResult && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/90 backdrop-blur-md p-6 animate-in fade-in zoom-in duration-300">
                            <div className="w-full text-center">
                                <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${isSuccess ? 'bg-green-500/10 text-green-500' :
                                    isWarning ? 'bg-yellow-500/10 text-yellow-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>
                                    {isSuccess ? <CheckCircle size={40} /> :
                                        isWarning ? <AlertTriangle size={40} /> :
                                            <XCircle size={40} />}
                                </div>

                                <h3 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-white' : isWarning ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {isSuccess ? 'Access Granted' :
                                        isWarning ? 'Already Scanned' : 'Access Denied'}
                                </h3>

                                {isWarning && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mb-4 text-yellow-200 text-sm">
                                        This QR was terminated/banded.
                                    </div>
                                )}

                                <p className="text-gray-400 mb-6 font-medium">{scanResult.message}</p>

                                {scanResult.user && (
                                    <div className="mb-6 rounded-xl bg-gray-800/50 p-4 border border-gray-700 text-left">
                                        <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
                                            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                                {scanResult.user.fullName?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-lg leading-tight">{scanResult.user.fullName || scanResult.user.name}</p>
                                                <p className="text-gray-500 text-xs font-mono">{scanResult.user.studentId || scanResult.user.id}</p>
                                            </div>
                                        </div>
                                        {scanResult.user.class && (
                                            <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Class/Dept</span>
                                                <span className="text-gray-300 font-medium">{scanResult.user.class}</span>
                                            </div>
                                        )}
                                        {scanResult.scannedAt && (
                                            <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between items-center text-sm text-red-300">
                                                <span>First Scanned</span>
                                                <span>{new Date(scanResult.scannedAt).toLocaleTimeString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={resetScanner}
                                    className={`w-full rounded-xl px-4 py-3.5 font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isSuccess ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' :
                                        'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                >
                                    <RotateCcw size={18} />
                                    Scan Next QR
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scanner Guide Overlay */}
                    {!scanResult && scanning && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-64 w-64 rounded-3xl border-2 border-white/20 relative">
                                <div className="absolute top-0 left-0 h-8 w-8 border-l-4 border-t-4 border-blue-500 rounded-tl-xl -translate-x-1 -translate-y-1"></div>
                                <div className="absolute top-0 right-0 h-8 w-8 border-r-4 border-t-4 border-blue-500 rounded-tr-xl translate-x-1 -translate-y-1"></div>
                                <div className="absolute bottom-0 left-0 h-8 w-8 border-l-4 border-b-4 border-blue-500 rounded-bl-xl -translate-x-1 translate-y-1"></div>
                                <div className="absolute bottom-0 right-0 h-8 w-8 border-r-4 border-b-4 border-blue-500 rounded-br-xl translate-x-1 translate-y-1"></div>
                                <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500/50 animate-pulse w-full px-4" strokeWidth={1} />
                            </div>
                            <p className="absolute bottom-10 text-white/70 text-sm font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                                Point camera at QR Code
                            </p>
                        </div>
                    )}

                    {/* Loading Spinner */}
                    {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                            <p className="mt-4 font-medium text-white">Verifying...</p>
                        </div>
                    )}
                </div>

                {/* File Upload Section */}
                <div className="bg-gray-900 border-t border-gray-800 p-4">
                    {/* Keep in DOM but invisible to ensure canvas rendering works */}
                    <div id="html5-qrcode-temp" className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden"></div>
                    <label className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors border border-gray-700 cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    const originalFile = e.target.files[0];
                                    setLoading(true);

                                    // Use a unique ID for temp scanner to avoid conflicts
                                    const tempId = "html5-qrcode-temp";
                                    // @ts-ignore
                                    // kept for potential future use or to satisfy TS if needed, but we use jsQR now
                                    // const html5QrCode = new Html5Qrcode(tempId);

                                    try {
                                        // Robust Scan with jsQR
                                        const decodedText = await scanFileWithJsQR(originalFile);
                                        await handleScan(decodedText);
                                    } catch (err: any) {
                                        console.warn("File Scan Error:", err);
                                        alert("Could not detect a valid QR code in this image. Please ensure the image is clear or try scanning with the camera.");
                                        startScanner();
                                    } finally {
                                        setLoading(false);
                                        e.target.value = '';
                                    }
                                }
                            }}
                        />
                        <Camera size={18} className="text-blue-400" />
                        <span>Upload QR Image</span>
                    </label>
                </div>
            </div>

            {/* Recent Scans List */}
            <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center gap-2">
                    <History size={18} className="text-gray-400" />
                    <h3 className="font-semibold text-white">Recent Scans</h3>
                </div>
                <div className="divide-y divide-gray-800 max-h-[300px] overflow-y-auto">
                    {statsData?.recentScans?.length > 0 ? (
                        statsData.recentScans.map((scan: any) => (
                            <div key={scan.scanId} className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-white">{scan.userName || 'Unknown User'}</p>
                                    <p className="text-xs text-gray-500">{scan.studentId || '#'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">{new Date(scan.scannedAt).toLocaleTimeString()}</p>
                                    <span className="text-[10px] text-green-500 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/30">Active</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No recent scans found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

