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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center text-white">
                    <ShieldCheck size={48} className="mx-auto mb-4 opacity-90" />
                    <h1 className="text-3xl font-bold">Welcome Back</h1>
                    <p className="opacity-80">Sign in to manage your events</p>
                </div>

                <div className="p-8 space-y-6">
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID</label>
                            <input
                                type="text"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                className="w-full text-black px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="Enter Admin ID"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full text-black px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                placeholder="Enter Password"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Sign in as Admin"}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={() => signIn("google", { callbackUrl: "/" })}
                        className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm text-gray-800"
                    >
                        <Mail size={18} />
                        Sign in with Google
                    </button>

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <details className="text-xs text-center text-gray-400 cursor-pointer">
                            <summary className="hover:text-blue-500 transition-colors">Server Status (Diagnostic)</summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-left space-y-1 font-mono">
                                <p className="flex justify-between"><span>API URL:</span> <span className="text-blue-600 truncate ml-2">{process.env.NEXT_PUBLIC_API_URL || "Using Fallback"}</span></p>
                                <button
                                    onClick={async () => {
                                        const url = `${process.env.NEXT_PUBLIC_API_URL || "https://qr-token-verifer-server.vercel.app/api"}/health`.replace('/api/health', '/health');
                                        try {
                                            const res = await fetch(url);
                                            const data = await res.json();
                                            alert(`Server Status: ${data.status}\nAdmin ID: ${data.admin_id}\nDatabase: ${data.database}`);
                                        } catch (e) {
                                            alert("Could not connect to backend server. Check your NEXT_PUBLIC_API_URL.");
                                        }
                                    }}
                                    className="text-blue-500 hover:underline mt-2 block w-full text-center"
                                >
                                    Check Live Connection Now
                                </button>
                            </div>
                        </details>
                    </div>

                </div>
            </div>
        </div>
    );
}
