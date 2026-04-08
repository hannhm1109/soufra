import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    // Always return 200 — never leak whether email exists
    if (!user || !user.password) {
      return NextResponse.json({ success: true })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
    await sendPasswordResetEmail(email, resetUrl)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[forgot-password] Unexpected error:", err)
    // Still return 200 — never leak whether the email exists or the failure reason
    return NextResponse.json({ success: true })
  }
}
