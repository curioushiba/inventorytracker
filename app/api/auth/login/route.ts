import { NextResponse } from "next/server"
import { z } from "zod"
import { kv, isKvConfigured } from "@/lib/kv"
import bcrypt from "bcryptjs"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = schema.parse(body)

    if (!isKvConfigured()) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 })
    }

    const userKey = `user:${email.toLowerCase()}`
    const user: any = await kv.get(userKey)
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (err: any) {
    const message = err?.message || "Invalid request"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


