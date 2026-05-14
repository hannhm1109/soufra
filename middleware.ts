import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session

  const isAuthPage = nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register")

  const isProtectedPage = nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/grocery") ||
    nextUrl.pathname.startsWith("/favorites") ||
    nextUrl.pathname.startsWith("/settings") ||
    nextUrl.pathname.startsWith("/history") ||
    nextUrl.pathname.startsWith("/recipes") ||
    nextUrl.pathname.startsWith("/onboarding")

  // If logged in and trying to access auth pages → redirect to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // If not logged in and trying to access protected pages → redirect to login
  if (!isLoggedIn && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
}
