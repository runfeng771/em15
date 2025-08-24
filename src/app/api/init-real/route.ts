import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // 清空现有数据
    await db.email.deleteMany({})
    await db.emailAccount.deleteMany({})

    // 创建真实的默认账号
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

    return NextResponse.json({ 
      message: '真实邮件账号创建成功',
      accounts: createdAccounts 
    })
  } catch (error) {
    console.error('初始化真实账号失败:', error)
    return NextResponse.json({ error: '初始化真实账号失败' }, { status: 500 })
  }
}