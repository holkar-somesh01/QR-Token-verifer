"use client";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store";
import { useRef } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
    const storeRef = useRef<ReturnType<typeof makeStore>>(null);
    if (!storeRef.current) {
        storeRef.current = makeStore();
    }

    return (
        <SessionProvider>
            <Provider store={storeRef.current}>
                {children}
            </Provider>
        </SessionProvider>
    );
}
