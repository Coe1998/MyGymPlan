import { NextRequest, NextResponse } from 'next/server'
import { sendTelegram } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const { full_name, email } = await request.json()

    const now = new Date().toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    await sendTelegram(
      `🏋️ <b>Nuovo coach in attesa!</b>\n\n` +
      `👤 <b>Nome:</b> ${full_name ?? 'N/D'}\n` +
      `📧 <b>Email:</b> ${email ?? 'N/D'}\n` +
      `🕐 <b>Registrato:</b> ${now}\n\n` +
      `👉 Vai su <a href="https://my-gym-plan-delta.vercel.app/admin/dashboard">Admin Dashboard</a> per approvarlo`
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
