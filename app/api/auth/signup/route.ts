import { NextResponse } from "next/server"
import { z } from "zod"
import { kv, isKvConfigured } from "@/lib/kv"
import bcrypt from "bcryptjs"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = schema.parse(body)

    if (!isKvConfigured()) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 })
    }

    const userKey = `user:${email.toLowerCase()}`
    const existing = await kv.get(userKey)
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const id = Date.now().toString()
    const passwordHash = await bcrypt.hash(password, 10)
    const user = { id, email, name, passwordHash }
    await kv.set(userKey, user)

    return NextResponse.json({ id, email, name })
  } catch (err: any) {
    const message = err?.message || "Invalid request"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


