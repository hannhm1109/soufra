import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const CUISINE_LABEL: Record<string, string> = {
  moroccan:       "🇲🇦 Moroccan",
  mediterranean:  "🫒 Mediterranean",
  healthy:        "🥗 Healthy Essentials",
  middle_eastern: "🧆 Middle Eastern",
  italian:        "🇮🇹 Italian",
}

const NUTRITION_TIPS: Record<string, string> = {
  lose_weight: "Try replacing one refined carb per day with lentils or chickpeas — same volume, fewer calories, more satiety.",
  gain_muscle: "Spread protein across all 3 meals (aim for 25–30g each) rather than loading it at dinner — it improves muscle synthesis throughout the day.",
  maintain: "Batch-cook one grain on Sunday (bulgur, rice, or couscous) — it cuts your daily prep time by half and keeps portions consistent.",
  eat_better: "Add one colorful vegetable you don't usually eat this week — variety in color means variety in micronutrients.",
}

export async function sendWeeklyReport(params: {
  email: string
  firstName: string
  avgCalories: number | null
  calorieTarget: number | null
  mealsPlanned: number
  topCuisine: string | null
  topRatedRecipe: string | null
  totalCost: number | null
  weeklyBudget: number | null
  fitnessGoal: string | null
  appUrl: string
}) {
  const {
    email, firstName, avgCalories, calorieTarget,
    mealsPlanned, topCuisine, topRatedRecipe,
    totalCost, weeklyBudget, fitnessGoal, appUrl,
  } = params

  const tip = NUTRITION_TIPS[fitnessGoal ?? ""] ?? NUTRITION_TIPS.maintain
  const cuisineLabel = topCuisine ? (CUISINE_LABEL[topCuisine] ?? topCuisine) : null

  const calDiff = avgCalories && calorieTarget ? avgCalories - calorieTarget : null
  const calDiffLabel = calDiff === null ? "" : calDiff > 0
    ? `<span style="color:#E67E22;font-weight:700;">+${calDiff} kcal above target</span>`
    : calDiff < 0
    ? `<span style="color:#27AE60;font-weight:700;">${Math.abs(calDiff)} kcal below target</span>`
    : `<span style="color:#27AE60;font-weight:700;">exactly on target</span>`

  const budgetOver = totalCost && weeklyBudget ? totalCost > weeklyBudget : false
  const budgetDiff = totalCost && weeklyBudget ? Math.abs(totalCost - weeklyBudget).toFixed(0) : null

  await resend.emails.send({
    from: "Soufra <onboarding@resend.dev>",
    to: email,
    subject: `${firstName}, your weekly Soufra report 📊`,
    html: `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:48px 24px;background-color:#FDFAF6;color:#2C3E50;">

  <!-- Header -->
  <div style="margin-bottom:32px;">
    <h1 style="font-size:28px;color:#2D5F5D;margin:0 0 4px 0;letter-spacing:-0.5px;">Soufra</h1>
    <p style="margin:0;color:#D4A574;font-size:13px;font-family:Arial,sans-serif;">Meal planning rooted in real cuisine</p>
  </div>

  <!-- Greeting -->
  <div style="background:white;border-radius:16px;padding:36px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <p style="font-size:18px;margin:0 0 8px 0;">Hey ${firstName} 👋</p>
    <p style="line-height:1.7;color:#4B5563;margin:0;font-family:Arial,sans-serif;font-size:15px;">
      Here's a quick look at how your week went with Soufra.
    </p>
  </div>

  <!-- Stats grid -->
  <div style="background:white;border-radius:16px;padding:28px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <p style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9CA3AF;font-family:Arial,sans-serif;margin:0 0 20px 0;">Your week in numbers</p>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <!-- Avg calories -->
        <td style="width:33%;padding:0 8px 0 0;vertical-align:top;">
          <div style="background:#FFF7F0;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#E67E22;font-family:Arial,sans-serif;">
              ${avgCalories ?? "—"}
            </div>
            <div style="font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;margin-top:4px;">avg kcal/day</div>
            ${calDiff !== null ? `<div style="font-size:10px;font-family:Arial,sans-serif;margin-top:6px;">${calDiffLabel}</div>` : ""}
          </div>
        </td>
        <!-- Meals planned -->
        <td style="width:33%;padding:0 4px;vertical-align:top;">
          <div style="background:#F0F7F7;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#2D5F5D;font-family:Arial,sans-serif;">
              ${mealsPlanned}
            </div>
            <div style="font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;margin-top:4px;">meals planned</div>
          </div>
        </td>
        <!-- Top cuisine -->
        <td style="width:33%;padding:0 0 0 8px;vertical-align:top;">
          <div style="background:#F5F3FF;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#6366F1;font-family:Arial,sans-serif;">
              ${cuisineLabel ? cuisineLabel.split(" ").slice(0,2).join(" ") : "—"}
            </div>
            <div style="font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;margin-top:4px;">top cuisine</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  ${topRatedRecipe ? `
  <!-- Top rated meal -->
  <div style="background:#2D5F5D;border-radius:16px;padding:24px;margin-bottom:20px;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.5);font-family:Arial,sans-serif;margin:0 0 8px 0;">Your top rated meal this week</p>
    <p style="font-size:17px;font-weight:700;color:white;margin:0;">⭐ ${topRatedRecipe}</p>
  </div>
  ` : ""}

  ${totalCost !== null && weeklyBudget !== null ? `
  <!-- Budget -->
  <div style="background:white;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9CA3AF;font-family:Arial,sans-serif;margin:0 0 12px 0;">Budget snapshot</p>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-family:Arial,sans-serif;font-size:14px;color:#6B7280;">Grocery estimate</span>
      <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:${budgetOver ? "#E74C3C" : "#27AE60"};">
        ${totalCost.toFixed(0)} DH
      </span>
    </div>
    <div style="background:#F3F4F6;border-radius:99px;height:6px;overflow:hidden;margin-bottom:8px;">
      <div style="background:${budgetOver ? "#E74C3C" : "#27AE60"};height:6px;width:${Math.min((totalCost / weeklyBudget) * 100, 100)}%;border-radius:99px;"></div>
    </div>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#9CA3AF;margin:0;">
      ${budgetOver
        ? `Over budget by ${budgetDiff} DH — consider swapping a few premium items for souk alternatives.`
        : `${budgetDiff} DH under your ${weeklyBudget} DH weekly budget. Well planned!`}
    </p>
  </div>
  ` : ""}

  <!-- Nutrition tip -->
  <div style="background:#FFFBEB;border-radius:16px;padding:24px;margin-bottom:24px;border-left:4px solid #F59E0B;">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#D97706;font-family:Arial,sans-serif;margin:0 0 8px 0;">This week's tip</p>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#4B5563;margin:0;line-height:1.6;">${tip}</p>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${appUrl}/dashboard"
      style="display:inline-block;background-color:#2D5F5D;color:white;padding:15px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,sans-serif;">
      Generate next week's plan →
    </a>
  </div>

  <!-- Footer -->
  <p style="font-family:Arial,sans-serif;font-size:12px;color:#9CA3AF;margin:0;text-align:center;line-height:1.6;">
    Soufra — Moroccan &amp; Mediterranean cuisine, planned for you.<br/>
    <a href="${appUrl}/settings" style="color:#9CA3AF;">Manage your preferences</a>
  </p>

</div>`,
  })
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: "Soufra <onboarding@resend.dev>",
    to: email,
    subject: "Reset your Soufra password",
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; background-color: #FDFAF6; color: #2C3E50;">
        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 28px; color: #2D5F5D; margin: 0 0 4px 0; letter-spacing: -0.5px;">Soufra</h1>
          <p style="margin: 0; color: #D4A574; font-size: 13px; font-family: Arial, sans-serif;">Meal planning rooted in real cuisine</p>
        </div>
        <div style="background: white; border-radius: 16px; padding: 36px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          <p style="font-size: 18px; margin: 0 0 16px 0;">Reset your password</p>
          <p style="line-height: 1.7; color: #4B5563; margin: 0 0 24px 0; font-family: Arial, sans-serif; font-size: 15px;">
            We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}"
            style="display: inline-block; background-color: #2D5F5D; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; font-family: Arial, sans-serif;">
            Reset password
          </a>
          <p style="margin-top: 24px; font-family: Arial, sans-serif; font-size: 13px; color: #9CA3AF;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <p style="font-family: Arial, sans-serif; font-size: 13px; color: #9CA3AF; margin: 0; text-align: center;">
          Soufra &mdash; Moroccan &amp; Mediterranean cuisine, planned for you.
        </p>
      </div>
    `,
  })
}

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
          Soufra &mdash; Moroccan &amp; Mediterranean cuisine, planned for you.<br/>
          If you didn't create this account, you can ignore this email.
        </p>

      </div>
    `
  })
}
