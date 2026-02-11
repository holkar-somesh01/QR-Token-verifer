"use client";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Menu, X, QrCode } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
    const { data: session } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-sm">
                            <QrCode size={18} />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-gray-900">QR<span className="text-blue-600">Admin</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/users" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                            Users
                        </Link>
                        <Link href="/attendance" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                            Attendance
                        </Link>
                    </div>

                </div>

                <div className="hidden md:flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium text-sm">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-900 leading-none">{session?.user?.name || "Admin"}</span>
                            <span className="text-[10px] text-gray-500 leading-none mt-0.5">{session?.user?.email || "admin@local.com"}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                        <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
                        Sign Out
                    </button>
                </div>

                <div className="flex md:hidden">
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white p-4 space-y-4 shadow-lg animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">
                            {session?.user?.name?.[0] || "A"}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                            <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                    </div>
                    <div className="flex flex-col space-y-2 px-2 pt-2">
                        <Link href="/" className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                            Dashboard
                        </Link>
                        <Link href="/users" className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                            Users
                        </Link>
                        <Link href="/attendance" className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                            Attendance
                        </Link>
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={() => signOut()}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
