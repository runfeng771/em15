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

    console.log(`正在从服务器获取 ${account.email} 的最新邮件...`)

    // 测试连接
    const isConnected = await emailService.testConnection(account)
    if (!isConnected) {
      return NextResponse.json({ error: '无法连接到邮件服务器，请检查账号信息' }, { status: 400 })
    }

    // 从IMAP服务器获取邮件
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

    // 将新邮件添加到缓存（保留现有邮件）
    emailCache.addEmails(accountId, formattedEmails)
    
    const totalEmails = emailCache.getAllEmails(accountId).length
    const newEmailsCount = formattedEmails.length

    console.log(`成功添加 ${newEmailsCount} 封新邮件到缓存，当前账号总邮件数: ${totalEmails}`)

    return NextResponse.json({ 
      message: '邮件刷新成功',
      newEmailsCount: newEmailsCount,
      totalEmails: totalEmails,
      emails: emailCache.getAllEmails(accountId),
      source: 'server' // 标记数据来源为服务器
    })
  } catch (error) {
    console.error('刷新邮件失败:', error)
    return NextResponse.json({ 
      error: '刷新邮件失败', 
      details: error.message 
    }, { status: 500 })
  }
}