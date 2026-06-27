import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/services/auth/jwt";

const LOGIN_PATH = "/login";

/**
 * Auth gate (Next 16 `proxy` convention, formerly `middleware`). Signature-only
 * — verifies the session JWT without any DB access so it stays Edge-safe (never
 * touches `bun:sqlite`/`sqlite-vec`). DB-backed re-validation (user still exists
 * + active) happens server-side in the root layout via `getSession()`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = await verifySessionToken(token);
  const isAuthed = claims != null;

  if (pathname === LOGIN_PATH) {
    // Already signed in → send to home instead of showing the login form.
    if (isAuthed) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthed) {
    const url = new URL(LOGIN_PATH, request.url);
    // Preserve where they were headed so we can bounce back after login.
    const next = pathname + request.nextUrl.search;
    if (next && next !== "/") {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets. Server-action
  // POSTs hit their page route and are covered here.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)$).*)"],
};
