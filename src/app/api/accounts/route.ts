import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailService } from '@/lib/email-service'

export async function GET() {
  try {
    const accounts = await db.emailAccount.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('获取邮件账号失败:', error)
    return NextResponse.json({ error: '获取邮件账号失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, imapServer, imapPort, smtpServer, smtpPort } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }

    // 测试连接
    const testAccount = {
      id: 'test',
      email,
      password,
      imapServer: imapServer || 'imap.email.cn',
      imapPort: imapPort || 993,
      smtpServer: smtpServer || 'smtp.email.cn',
      smtpPort: smtpPort || 465,
      isActive: true
    }
    
    const isConnected = await emailService.testConnection(testAccount)
    if (!isConnected) {
      return NextResponse.json({ error: '连接邮件服务器失败，请检查邮箱和密码' }, { status: 400 })
    }

    const account = await db.emailAccount.create({
      data: {
        email,
        password,
        imapServer: imapServer || 'imap.email.cn',
        imapPort: imapPort || 993,
        smtpServer: smtpServer || 'smtp.email.cn',
        smtpPort: smtpPort || 465,
        isActive: true
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('创建邮件账号失败:', error)
    return NextResponse.json({ error: '创建邮件账号失败' }, { status: 500 })
  }
}