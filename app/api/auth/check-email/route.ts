import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
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
