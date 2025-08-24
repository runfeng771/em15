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
      return NextResponse.json({ error: '无法连接到邮件服务器' }, { status: 400 })
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

    // 获取最近30分钟的邮件
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const latestEmails = fetchedEmails.filter(email => 
      email.receivedAt > thirtyMinutesAgo
    )

    console.log(`最近30分钟内的邮件数量: ${latestEmails.length}`)

    if (latestEmails.length === 0) {
      // 如果30分钟内没有邮件，尝试获取最近1小时的邮件
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentEmails = fetchedEmails.filter(email => 
        email.receivedAt > oneHourAgo
      )
      
      console.log(`最近1小时内的邮件数量: ${recentEmails.length}`)
      
      if (recentEmails.length === 0) {
        return NextResponse.json({ 
          message: '没有最新邮件',
          count: 0,
          emails: []
        })
      }
      
      // 格式化最近1小时的邮件并更新缓存
      const formattedEmails = recentEmails.map(email => ({
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

      // 添加新邮件到缓存（只更新邮件数据）
      emailCache.addEmails(accountId, formattedEmails)

      console.log(`成功获取并缓存 ${formattedEmails.length} 封最近1小时的邮件`)

      return NextResponse.json({ 
        message: '获取最近1小时邮件成功',
        count: formattedEmails.length,
        emails: formattedEmails,
        source: 'server'
      })
    }

    // 格式化最新邮件并更新缓存
    const formattedEmails = latestEmails.map(email => ({
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

    // 添加新邮件到缓存（只更新邮件数据）
    emailCache.addEmails(accountId, formattedEmails)

    console.log(`成功获取并缓存 ${formattedEmails.length} 封最新邮件`)

    return NextResponse.json({ 
      message: '获取最新邮件成功',
      count: formattedEmails.length,
      emails: formattedEmails,
      source: 'server'
    })
  } catch (error) {
    console.error('获取最新邮件失败:', error)
    return NextResponse.json({ 
      error: '获取最新邮件失败', 
      details: error.message 
    }, { status: 500 })
  }
}