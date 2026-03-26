"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/lib/features/apiSlice";
import { Loader2, Save, Calendar, Hash, Mail, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
    const { data: settings, isLoading, refetch } = useGetSettingsQuery();
    const [updateSettings, { isLoading: isUpdating }] = useUpdateSettingsMutation();
    
    const [formData, setFormData] = useState<any>({
        EVENT_START_DATE: "",
        EVENT_END_DATE: "",
        SCAN_CAPACITY: "4",
        SMTP_EMAIL: "",
        SMTP_PASSWORD: ""
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                EVENT_START_DATE: settings.EVENT_START_DATE || "",
                EVENT_END_DATE: settings.EVENT_END_DATE || "",
                SCAN_CAPACITY: settings.SCAN_CAPACITY || "4",
                SMTP_EMAIL: settings.SMTP_EMAIL || "",
                SMTP_PASSWORD: settings.SMTP_PASSWORD || ""
            });
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateSettings(formData).unwrap();
            toast.success("Settings updated successfully!", {
                icon: '⚙️',
                style: { borderRadius: '20px', fontFeatureSettings: '"tnum"' }
            });
            refetch();
        } catch (err: any) {
            toast.error(err.data?.message || "Failed to update settings");
        }
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <Navbar />
            
            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">System <span className="text-blue-600">Preferences</span></h1>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Configure event boundaries and security thresholds.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Event Configuration */}
                    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-800">
                                <ShieldCheck size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Core Event Controls</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Calendar size={12} /> Event Start Date
                                </label>
                                <input 
                                    type="date" 
                                    name="EVENT_START_DATE"
                                    value={formData.EVENT_START_DATE}
                                    onChange={handleChange}
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Calendar size={12} /> Event End Date
                                </label>
                                <input 
                                    type="date" 
                                    name="EVENT_END_DATE"
                                    value={formData.EVENT_END_DATE}
                                    onChange={handleChange}
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Hash size={12} /> Daily Scan Capacity (Per User)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="SCAN_CAPACITY"
                                        value={formData.SCAN_CAPACITY}
                                        onChange={handleChange}
                                        placeholder="e.g., 4"
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase">
                                        Max Scans
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic font-medium">This limit strictly governs how many times a user can scan their QR code within a 24-hour window.</p>
                            </div>
                        </div>
                    </section>

                    {/* Notification Configuration */}
                    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800">
                                <Mail size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Email Integration (SMTP)</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    SMTP Email Address
                                </label>
                                <input 
                                    type="email" 
                                    name="SMTP_EMAIL"
                                    value={formData.SMTP_EMAIL}
                                    onChange={handleChange}
                                    placeholder="sender@example.com"
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    App Password / Key
                                </label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        name="SMTP_PASSWORD"
                                        value={formData.SMTP_PASSWORD}
                                        onChange={handleChange}
                                        placeholder="••••••••••••"
                                        className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                    />
                                    <Lock size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="h-16 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-3 disabled:bg-slate-300"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Synchronize Settings
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
