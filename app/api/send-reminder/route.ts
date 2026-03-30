import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { customerName, billType, amount, dueDate } = await req.json()

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Bhatti Mobile Center" <${process.env.SMTP_FROM}>`,
      to: process.env.ALERT_EMAIL,
      subject: `⚠️ Bill Due Soon — ${customerName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0c0e14;color:#e6e9f4;padding:32px;border-radius:16px;">
          <h2 style="color:#f0a500;margin:0 0 16px;">Bhatti Mobile Center</h2>
          <p style="color:#8890aa;margin:0 0 24px;">Bill payment reminder — due in 2 hours</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#8890aa;">Customer</td><td style="padding:8px 0;font-weight:600;">${customerName}</td></tr>
            <tr><td style="padding:8px 0;color:#8890aa;">Bill Type</td><td style="padding:8px 0;font-weight:600;">${billType}</td></tr>
            <tr><td style="padding:8px 0;color:#8890aa;">Amount</td><td style="padding:8px 0;font-weight:600;color:#f0a500;">Rs. ${amount}</td></tr>
            <tr><td style="padding:8px 0;color:#8890aa;">Due Date</td><td style="padding:8px 0;color:#ff4757;font-weight:600;">${dueDate}</td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#4a5268;">Bhatti Mobile Center — Roznamcha System</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
