import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailCache } from '@/lib/cache'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: '账号ID不能为空' }, { status: 400 })
    }

    // 从数据库获取账号信息
    const account = await db.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 })
    }

    console.log(`正在从服务器获取 ${account.email} 的所有邮件...`)

    // 测试连接
    const isConnected = await emailService.testConnection(account)
    if (!isConnected) {
      return NextResponse.json({ error: '无法连接到邮件服务器' }, { status: 400 })
    }

    // 从IMAP服务器获取所有邮件
    const fetchedEmails = await emailService.fetchEmails(account, 'inbox')
    
    if (fetchedEmails.length === 0) {
      return NextResponse.json({ 
        message: '服务器上没有邮件',
        count: 0,
        emails: []
      })
    }

    console.log(`从服务器获取到 ${fetchedEmails.length} 封邮件`)

    // 格式化邮件并更新缓存
    const formattedEmails = fetchedEmails.map(email => ({
      id: `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      body: email.body,
      htmlBody: email.htmlBody,
      folder: 'inbox',
      isRead: false,
      isStarred: false,
      receivedAt: email.receivedAt.toISOString(),
      accountId: account.id,
      messageId: email.messageId
    }))

    // 更新缓存（只更新邮件数据）
    emailCache.updateEmails(accountId, formattedEmails)

    console.log(`成功获取并缓存 ${formattedEmails.length} 封邮件`)

    return NextResponse.json({ 
      message: '获取所有邮件成功',
      count: formattedEmails.length,
      emails: formattedEmails,
      source: 'server'
    })
  } catch (error) {
    console.error('获取所有邮件失败:', error)
    return NextResponse.json({ 
      error: '获取所有邮件失败', 
      details: error.message 
    }, { status: 500 })
  }
}