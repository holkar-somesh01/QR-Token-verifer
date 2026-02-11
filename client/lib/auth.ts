import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.send",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                },
            },
        }),
        CredentialsProvider({
            name: "Admin Login",
            credentials: {
                id: { label: "ID", type: "text", placeholder: "admin" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.id || !credentials?.password) return null;

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://qr-token-verifer-server.vercel.app/api";
                    console.log("Attempting login at:", `${apiUrl}/auth/login`);

                    const res = await fetch(`${apiUrl}/auth/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: credentials.id,
                            password: credentials.password
                        })
                    });

                    console.log("Login HTTP Status:", res.status);
                    const data = await res.json();
                    console.log("Login Response Data:", data);

                    if (res.ok && data.user) {
                        return {
                            id: data.user.id,
                            name: data.user.name,
                            email: "admin@local.com",
                            role: "admin",
                            accessToken: data.token,
                        };
                    }
                    console.error("Login failed on server side:", data.message || "Unknown error");
                    return null;
                } catch (e) {
                    console.error("Critical Login Error in Auth.ts:", e);
                    return null;
                }

            }
        })
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            // Initial sign in
            if (account && user) {
                if (account.provider === "google") {
                    token.accessToken = account.access_token;
                    token.role = "user";
                } else if (account.provider === "credentials") {
                    token.accessToken = user.accessToken;
                    token.role = user.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.sub as string;
            }
            session.accessToken = token.accessToken as string;
            return session;
        },
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    secret: process.env.NEXTAUTH_SECRET,
};
