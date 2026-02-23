import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string, name: string) {
  const firstName = name?.split(" ")[0] || "there"

  await resend.emails.send({
    from: "Soufra <onboarding@resend.dev>",
    to: email,
    subject: "Welcome to Soufra",
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; background-color: #FDFAF6; color: #2C3E50;">

        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 28px; color: #2D5F5D; margin: 0 0 4px 0; letter-spacing: -0.5px;">Soufra</h1>
          <p style="margin: 0; color: #D4A574; font-size: 13px; font-family: Arial, sans-serif;">Meal planning rooted in real cuisine</p>
        </div>

        <div style="background: white; border-radius: 16px; padding: 36px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          <p style="font-size: 18px; margin: 0 0 20px 0;">Hey ${firstName},</p>
          <p style="line-height: 1.7; color: #4B5563; margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 15px;">
            Your Soufra account is ready. We built this to make weekly meal planning feel less like a chore — personalized to your goals, your budget, and the cuisines you actually enjoy.
          </p>
          <p style="line-height: 1.7; color: #4B5563; margin: 0 0 28px 0; font-family: Arial, sans-serif; font-size: 15px;">
            Start by completing your profile, then generate your first week of meals. The more you like and dislike recipes, the better your plans get over time.
          </p>

          <a href="${process.env.NEXTAUTH_URL}/onboarding"
            style="display: inline-block; background-color: #2D5F5D; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; font-family: Arial, sans-serif;">
            Set up your profile
          </a>
        </div>

        <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9CA3AF; margin: 0; text-align: center; line-height: 1.6;">
          Soufra &mdash; Moroccan &amp; French cuisine, planned for you.<br/>
          If you didn't create this account, you can ignore this email.
        </p>

      </div>
    `
  })
}
