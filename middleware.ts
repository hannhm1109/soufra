import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PROTECTED_PATHS = [
  "/dashboard",
  "/grocery",
  "/history",
  "/favorites",
  "/recipes",
  "/settings",
  "/onboarding",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path))

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|logo\\.png|manifest\\.json|sw\\.js|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
}
