import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/dashboard/:path*", "/project-submittion"]
};

export function middleware(req: NextRequest) {
  const cookieName = process.env.COOKIE_NAME ?? "soaswag_at";
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
