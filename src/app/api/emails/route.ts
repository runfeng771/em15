import { NextRequest, NextResponse } from 'next/server'
import { emailCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const folder = searchParams.get('folder') || 'inbox'
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'date'

    if (!accountId) {
      return NextResponse.json({ error: '账号ID不能为空' }, { status: 400 })
    }

    // 从缓存获取邮件
    let emails = emailCache.getEmails(accountId, folder)

    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase()
      emails = emails.filter(email => 
        email.subject.toLowerCase().includes(searchLower) ||
        email.from.toLowerCase().includes(searchLower) ||
        email.body.toLowerCase().includes(searchLower)
      )
    }

    // 排序
    if (sortBy === 'date') {
      emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    } else if (sortBy === 'subject') {
      emails.sort((a, b) => a.subject.localeCompare(b.subject))
    }

    // 限制数量
    emails = emails.slice(0, 500)

    return NextResponse.json(emails)
  } catch (error) {
    console.error('获取邮件列表失败:', error)
    return NextResponse.json({ error: '获取邮件列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      subject, 
      from, 
      to, 
      cc, 
      bcc, 
      body, 
      htmlBody, 
      folder, 
      accountId 
    } = await request.json()

    if (!subject || !from || !to || !body || !accountId) {
      return NextResponse.json({ error: '必填字段不能为空' }, { status: 400 })
    }

    // 生成唯一ID
    const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const email = {
      id,
      subject,
      from,
      to,
      cc,
      bcc,
      body,
      htmlBody,
      folder: folder || 'sent',
      isRead: true,
      isStarred: false,
      receivedAt: new Date().toISOString(),
      accountId
    }

    // 添加到缓存
    const accountEmails = emailCache.getAllEmails(accountId)
    emailCache.updateEmails(accountId, [...accountEmails, email])

    return NextResponse.json(email)
  } catch (error) {
    console.error('创建邮件失败:', error)
    return NextResponse.json({ error: '创建邮件失败' }, { status: 500 })
  }
}