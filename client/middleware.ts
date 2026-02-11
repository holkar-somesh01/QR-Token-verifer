import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
    pages: {
        signIn: "/login",
    },
});

export const config = { matcher: ["/", "/users"] }; // Protect the dashboard and users page
