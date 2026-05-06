import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get("auth_user");

    // Sem cookie — não está logado
    if (!authCookie) {
      return NextResponse.redirect(
          new URL(`/login?next=${pathname}`, request.url)
      );
    }

    // Logado mas não é ADMIN — redireciona para home
    if (authCookie.value !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};