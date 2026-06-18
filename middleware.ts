import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admins/:path*",
    "/players/:path*",
    "/matches/:path*",
    "/rankings/:path*",
    "/onboarding/:path*",
    "/perfil/:path*",
    "/peladas/:path*",
    "/convite/:path*",
    "/pagamento/:path*"
  ]
};
