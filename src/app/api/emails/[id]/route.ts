import { NextRequest, NextResponse } from 'next/server'
import { emailCache } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 从所有账号的邮件中查找
    const accounts = emailCache.getAccounts()
    let foundEmail = null
    
    for (const account of accounts) {
      const emails = emailCache.getAllEmails(account.id)
      const email = emails.find(e => e.id === params.id)
      if (email) {
        foundEmail = email
        break
      }
    }

    if (!foundEmail) {
      return NextResponse.json({ error: '邮件不存在' }, { status: 404 })
    }

    return NextResponse.json(foundEmail)
  } catch (error) {
    console.error('获取邮件失败:', error)
    return NextResponse.json({ error: '获取邮件失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isRead, isStarred, folder } = await request.json()

    // 查找邮件所属的账号
    const accounts = emailCache.getAccounts()
    let accountId = null
    
    for (const account of accounts) {
      const emails = emailCache.getAllEmails(account.id)
      const email = emails.find(e => e.id === params.id)
      if (email) {
        accountId = account.id
        break
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: '邮件不存在' }, { status: 404 })
    }

    // 更新邮件
    emailCache.updateEmail(accountId, params.id, {
      isRead,
      isStarred,
      folder
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新邮件失败:', error)
    return NextResponse.json({ error: '更新邮件失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 查找邮件所属的账号
    const accounts = emailCache.getAccounts()
    let accountId = null
    
    for (const account of accounts) {
      const emails = emailCache.getAllEmails(account.id)
      const email = emails.find(e => e.id === params.id)
      if (email) {
        accountId = account.id
        break
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: '邮件不存在' }, { status: 404 })
    }

    // 删除邮件
    emailCache.deleteEmail(accountId, params.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除邮件失败:', error)
    return NextResponse.json({ error: '删除邮件失败' }, { status: 500 })
  }
}