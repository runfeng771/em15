import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailCache } from '@/lib/cache'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    // 从数据库获取所有账号信息
    const accounts = await db.emailAccount.findMany({
      where: { isActive: true }
    })

    if (accounts.length === 0) {
      return NextResponse.json({ 
        message: '没有活跃的邮件账号',
        totalAccounts: 0,
        totalEmails: 0,
        results: []
      })
    }

    console.log(`正在强制刷新全部 ${accounts.length} 个账号的邮件...`)

    const results = []
    let totalEmails = 0

    // 遍历所有账号，逐个刷新邮件
    for (const account of accounts) {
      try {
        console.log(`正在刷新账号: ${account.email}...`)

        // 测试连接
        const isConnected = await emailService.testConnection(account)
        if (!isConnected) {
          results.push({
            accountId: account.id,
            email: account.email,
            success: false,
            error: '无法连接到邮件服务器'
          })
          continue
        }

        // 从IMAP服务器获取邮件
        const fetchedEmails = await emailService.fetchEmails(account, 'inbox')
        
        console.log(`从服务器获取到 ${account.email} 的 ${fetchedEmails.length} 封邮件`)

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

        // 强制更新缓存
        emailCache.updateEmails(account.id, formattedEmails)

        results.push({
          accountId: account.id,
          email: account.email,
          success: true,
          emailCount: formattedEmails.length
        })

        totalEmails += formattedEmails.length

        console.log(`成功刷新 ${account.email} 的 ${formattedEmails.length} 封邮件`)

      } catch (error) {
        console.error(`刷新账号 ${account.email} 失败:`, error)
        results.push({
          accountId: account.id,
          email: account.email,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`全部账号刷新完成: 成功 ${successCount} 个账号，失败 ${failureCount} 个账号，总共 ${totalEmails} 封邮件`)

    return NextResponse.json({ 
      message: '全部账号刷新完成',
      totalAccounts: accounts.length,
      successCount: successCount,
      failureCount: failureCount,
      totalEmails: totalEmails,
      results: results
    })
  } catch (error) {
    console.error('刷新全部账号失败:', error)
    return NextResponse.json({ 
      error: '刷新全部账号失败', 
      details: error.message 
    }, { status: 500 })
  }
}