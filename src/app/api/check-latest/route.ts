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

    console.log(`正在检查 ${account.email} 的最新邮件...`)

    // 测试连接
    const isConnected = await emailService.testConnection(account)
    if (!isConnected) {
      return NextResponse.json({ error: '无法连接到邮件服务器' }, { status: 400 })
    }

    // 获取最近5分钟的邮件
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    console.log(`检查从 ${fiveMinutesAgo.toISOString()} 开始的最新邮件`)

    // 从IMAP服务器获取最新邮件
    const fetchedEmails = await emailService.fetchEmails(account, 'inbox')
    
    // 过滤出最近5分钟的邮件
    const recentEmails = fetchedEmails.filter(email => 
      email.receivedAt > fiveMinutesAgo
    )
    
    console.log(`获取到 ${fetchedEmails.length} 封邮件，其中最近5分钟内有 ${recentEmails.length} 封`)

    if (recentEmails.length === 0) {
      return NextResponse.json({ 
        message: '没有最新邮件',
        count: 0
      })
    }

    // 从缓存获取已存在的邮件，检查是否有重复
    const existingEmails = emailCache.getAllEmails(accountId)
    const existingMessageIds = new Set(existingEmails.map(e => e.messageId).filter(Boolean))
    
    // 对于最新邮件，使用宽松的去重策略
    const newEmails = recentEmails.filter(email => {
      if (email.messageId) {
        return !existingMessageIds.has(email.messageId)
      } else {
        // 没有messageId的邮件，使用更宽松的判断
        const existingSimilar = existingEmails.filter(e => 
          e.subject === email.subject && 
          e.from === email.from &&
          Math.abs(new Date(e.receivedAt).getTime() - email.receivedAt.getTime()) < 60000 // 1分钟内相似
        )
        return existingSimilar.length === 0
      }
    })

    console.log(`最新邮件中，新邮件数量: ${newEmails.length}`)

    if (newEmails.length === 0) {
      return NextResponse.json({ 
        message: '没有新邮件',
        count: 0
      })
    }

    // 格式化新邮件并保存到缓存
    const formattedEmails = newEmails.map(email => ({
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

    console.log(`成功保存 ${formattedEmails.length} 封最新邮件到缓存`)

    return NextResponse.json({ 
      message: '检查最新邮件成功',
      count: formattedEmails.length,
      emails: formattedEmails
    })
  } catch (error) {
    console.error('检查最新邮件失败:', error)
    return NextResponse.json({ 
      error: '检查最新邮件失败', 
      details: error.message 
    }, { status: 500 })
  }
}