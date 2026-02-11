"use client";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Menu, X, QrCode } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-md transition-transform group-hover:scale-105">
                            <QrCode size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">SCAN<span className="text-blue-600">CENTRAL</span></span>
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1">Enterprise QR Logic</span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
                            Dashboard
                        </Link>
                        <Link href="/users" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
                            Management
                        </Link>
                        <Link href="/attendance" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
                            Scan History
                        </Link>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <div className="view-profile flex items-center gap-3 pl-4 border-l border-slate-100">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 leading-none">{session?.user?.name || "Administrator"}</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Active Session</p>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900 font-bold border border-slate-200">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>

                <div className="flex md:hidden">
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-slate-100 bg-white p-4 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-4 px-2 py-3 bg-slate-50 rounded-2xl">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-900 font-bold text-lg">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">{session?.user?.name || "Admin User"}</p>
                            <p className="text-xs text-slate-500">Authorized Personnel</p>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-1 px-1">
                        <Link onClick={() => setMobileMenuOpen(false)} href="/" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Dashboard Overview
                        </Link>
                        <Link onClick={() => setMobileMenuOpen(false)} href="/users" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            User Management
                        </Link>
                        <Link onClick={() => setMobileMenuOpen(false)} href="/attendance" className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Attendance Logs
                        </Link>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                        <button
                            onClick={() => signOut()}
                            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
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

