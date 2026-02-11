"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Mail } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                id,
                password,
                redirect: false,
            });

            console.log("SignIn Response Received:", res);

            if (!res) {
                setError("No response from server. Check your connection.");
                setLoading(false);
                return;
            }

            if (res.error) {
                console.error("Login Result Error:", res.error);
                setError("Invalid ID or Password");
                setLoading(false);
            } else if (res.ok) {
                console.log("Login Result Success, redirecting...");
                window.location.href = "/";
            } else {
                setError("An unexpected error occurred during login.");
                setLoading(false);
            }
        } catch (err: any) {
            console.error("Client-side login exception:", err);
            setError("Connection error. Please try again.");
            setLoading(false);
        }


    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-slate-200/50 rounded-full blur-3xl opacity-50"></div>

            <div className="w-full max-w-md relative z-10 transition-all">
                {/* Brand Logo */}
                <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold shadow-2xl mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Scan<span className="text-blue-600">Central</span></h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Enterprise Access Control</p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
                    <div className="p-10 space-y-8">
                        <div className="text-center">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Security Gateway</h2>
                            <p className="text-sm text-slate-500 font-medium mt-1">Authorized personnel only.</p>
                        </div>

                        <form onSubmit={handleAdminLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Admin Identifier</label>
                                <input
                                    type="text"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="w-full text-slate-900 font-semibold px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="Enter your index..."
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Access Token / Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full text-slate-900 font-semibold px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-red-600 text-[11px] text-center font-black p-3 rounded-2xl bg-red-50 border border-red-100 animate-in shake-in duration-300 uppercase tracking-tight">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Request Access"}
                            </button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                <span className="px-4 bg-white text-slate-400">Auxiliary Auth</span>
                            </div>
                        </div>

                        <button
                            onClick={() => signIn("google", { callbackUrl: "/" })}
                            className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                            <Mail size={18} className="text-slate-400" />
                            Sign in with Google Account
                        </button>

                        <div className="pt-6 border-t border-slate-50">
                            <details className="group">
                                <summary className="text-[10px] text-center text-slate-300 font-black uppercase tracking-widest cursor-pointer list-none hover:text-blue-500 transition-colors">
                                    System Diagnosis info
                                </summary>
                                <div className="mt-4 p-5 bg-slate-50 rounded-2xl text-left space-y-2 font-mono text-[10px] border border-slate-100">
                                    <p className="flex justify-between text-slate-500"><span>ENDPOINT:</span> <span className="text-blue-600 font-bold truncate ml-2">https://qr-server.vercel.app</span></p>
                                    <button
                                        onClick={async () => {
                                            const url = "https://qr-token-verifer-server.vercel.app/api/auth/health";
                                            try {
                                                const res = await fetch(url);
                                                const data = await res.json();
                                                alert(`System Status: ${data.status}\nNode: SECURE_CORE_01`);
                                            } catch (e) {
                                                alert("Connection to central server timed out.");
                                            }
                                        }}
                                        className="text-blue-600 font-bold hover:underline block w-full text-center py-2"
                                    >
                                        Execute Health Protocol
                                    </button>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>

                <p className="mt-10 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    Centralized Authentication Interface &copy; 2026
                </p>
            </div>
        </div>
    );
}


