"use client";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Menu, X, QrCode } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm dark:shadow-black/20 transition-colors duration-300">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold shadow-md dark:shadow-blue-500/20 transition-transform group-hover:scale-105">
                            <QrCode size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">SCAN<span className="text-blue-600 dark:text-blue-500">CENTRAL</span></span>
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 dark:text-slate-500 mt-1">Enterprise QR Logic</span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all">
                            Dashboard
                        </Link>
                        <Link href="/users" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all">
                            Management
                        </Link>
                        <Link href="/attendance" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all">
                            Scan History
                        </Link>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

                    <div className="view-profile flex items-center gap-3 pl-2">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{session?.user?.name || "Administrator"}</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Active Session</p>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-800">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-500 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>

                <div className="flex md:hidden gap-4 items-center">
                    <ThemeToggle />
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-xl dark:shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 relative z-50">
                    <div className="flex items-center gap-4 px-2 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-inner border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-lg">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{session?.user?.name || "Admin User"}</p>
                            <p className="text-xs text-slate-500">Authorized Personnel</p>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-1 px-1">
                        <Link onClick={() => setMobileMenuOpen(false)} href="/" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            Dashboard Overview
                        </Link>
                        <Link onClick={() => setMobileMenuOpen(false)} href="/users" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            User Management
                        </Link>
                        <Link onClick={() => setMobileMenuOpen(false)} href="/attendance" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            Attendance Logs
                        </Link>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                        <button
                            onClick={() => signOut()}
                            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                            <LogOut size={18} />
                            Terminate Session
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
