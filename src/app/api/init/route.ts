import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // 检查是否已经有账号
    const existingAccounts = await db.emailAccount.findMany()
    if (existingAccounts.length > 0) {
      return NextResponse.json({ 
        message: '默认账号已存在',
        accounts: existingAccounts 
      })
    }

    // 创建默认账号
    const defaultAccounts = [
      {
        email: '18@HH.email.cn',
        password: 'yuHKfnKvCqmw6HNN',
        imapServer: 'imap.email.cn',
        imapPort: 993,
        smtpServer: 'smtp.email.cn',
        smtpPort: 465,
        isActive: true
      },
      {
        email: 'Steven@HH.email.cn',
        password: 'KftcWviBjFcgnwfJ',
        imapServer: 'imap.email.cn',
        imapPort: 993,
        smtpServer: 'smtp.email.cn',
        smtpPort: 465,
        isActive: true
      },
      {
        email: '168@HH.email.cn',
        password: 'KWf2YAGsPE5xWP3G',
        imapServer: 'imap.email.cn',
        imapPort: 993,
        smtpServer: 'smtp.email.cn',
        smtpPort: 465,
        isActive: true
      },
      {
        email: '1688@HH.email.cn',
        password: '4kIYwAgzCsaGQBMT',
        imapServer: 'imap.email.cn',
        imapPort: 993,
        smtpServer: 'smtp.email.cn',
        smtpPort: 465,
        isActive: true
      },
      {
        email: '99@HH.email.cn',
        password: 'tX7Vv2AsFZ2dBFV6',
        imapServer: 'imap.email.cn',
        imapPort: 993,
        smtpServer: 'smtp.email.cn',
        smtpPort: 465,
        isActive: true
      }
    ]

    const createdAccounts = await Promise.all(
      defaultAccounts.map(account => 
        db.emailAccount.create({
          data: account
        })
      )
    )

    // 为每个账号创建一些示例邮件
    const sampleEmails = [
      {
        subject: '欢迎使用邮件管理系统',
        from: 'system@example.com',
        body: '欢迎使用我们的邮件管理系统！这是一个功能强大的多邮箱管理工具。',
        folder: 'inbox',
        isRead: false,
        isStarred: true
      },
      {
        subject: '会议通知',
        from: 'meeting@company.com',
        body: '请参加明天下午2点的产品会议。',
        folder: 'inbox',
        isRead: true,
        isStarred: false
      },
      {
        subject: '周报提醒',
        from: 'hr@company.com',
        body: '请记得在本周五之前提交您的周报。',
        folder: 'inbox',
        isRead: false,
        isStarred: false
      }
    ]

    await Promise.all(
      createdAccounts.map(account =>
        Promise.all(
          sampleEmails.map(email =>
            db.email.create({
              data: {
                ...email,
                to: account.email,
                receivedAt: new Date(),
                accountId: account.id
              }
            })
          )
        )
      )
    )

    return NextResponse.json({ 
      message: '默认账号和示例邮件创建成功',
      accounts: createdAccounts 
    })
  } catch (error) {
    console.error('初始化默认账号失败:', error)
    return NextResponse.json({ error: '初始化默认账号失败' }, { status: 500 })
  }
}