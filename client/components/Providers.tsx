"use client";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store";
import { useRef } from "react";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
    const storeRef = useRef<ReturnType<typeof makeStore>>(null);
    if (!storeRef.current) {
        storeRef.current = makeStore();
    }

    return (
        <SessionProvider>
            <Provider store={storeRef.current}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    {children}
                </ThemeProvider>
            </Provider>
        </SessionProvider>
    );
}
