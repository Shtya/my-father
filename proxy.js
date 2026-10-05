import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/setup") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
