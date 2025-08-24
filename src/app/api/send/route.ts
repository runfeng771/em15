import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailCache } from '@/lib/cache'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, htmlBody, cc, bcc, accountId } = await request.json()

    if (!to || !subject || !body || !accountId) {
      return NextResponse.json({ error: '收件人、主题、内容和账号ID不能为空' }, { status: 400 })
    }

    // 从数据库获取发送账号信息
    const account = await db.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return NextResponse.json({ error: '发送账号不存在' }, { status: 404 })
    }

    console.log(`正在从 ${account.email} 发送邮件到 ${to}...`)

    // 发送邮件
    const sent = await emailService.sendEmail(account, to, subject, body, htmlBody)
    
    if (!sent) {
      return NextResponse.json({ error: '邮件发送失败，请检查SMTP配置' }, { status: 500 })
    }

    // 保存发送的邮件到缓存（只更新邮件数据）
    const sentEmail = {
      id: `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      from: account.email,
      to,
      cc,
      bcc,
      body,
      htmlBody,
      folder: 'sent',
      isRead: true,
      isStarred: false,
      receivedAt: new Date().toISOString(),
      accountId
    }

    // 添加已发送邮件到缓存（保留现有邮件）
    emailCache.addEmails(accountId, [sentEmail])

    console.log(`邮件发送成功: ${subject}`)

    return NextResponse.json({ 
      message: '邮件发送成功',
      email: sentEmail
    })
  } catch (error) {
    console.error('发送邮件失败:', error)
    return NextResponse.json({ 
      error: '发送邮件失败', 
      details: error.message 
    }, { status: 500 })
  }
}