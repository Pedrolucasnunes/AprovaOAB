import { NextRequest, NextResponse } from "next/server"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email } = body

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254) {
    return NextResponse.json({ exists: false })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=10`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  )

  if (!res.ok) {
    return NextResponse.json({ exists: false })
  }

  const data = await res.json()
  const normalizedEmail = email.trim().toLowerCase()
  const exists =
    Array.isArray(data?.users) &&
    data.users.some((u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail)

  return NextResponse.json({ exists })
}
