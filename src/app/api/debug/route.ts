import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: '账号ID不能为空' }, { status: 400 })
    }

    // 获取账号信息
    const account = await db.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 })
    }

    // 统计各文件夹的邮件数量
    const inboxCount = await db.email.count({
      where: {
        accountId: accountId,
        folder: 'inbox'
      }
    })

    const sentCount = await db.email.count({
      where: {
        accountId: accountId,
        folder: 'sent'
      }
    })

    const totalCount = await db.email.count({
      where: {
        accountId: accountId
      }
    })

    // 获取最新的10封邮件
    const latestEmails = await db.email.findMany({
      where: {
        accountId: accountId,
        folder: 'inbox'
      },
      orderBy: {
        receivedAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        subject: true,
        from: true,
        receivedAt: true,
        messageId: true
      }
    })

    // 获取最老的10封邮件
    const oldestEmails = await db.email.findMany({
      where: {
        accountId: accountId,
        folder: 'inbox'
      },
      orderBy: {
        receivedAt: 'asc'
      },
      take: 10,
      select: {
        id: true,
        subject: true,
        from: true,
        receivedAt: true,
        messageId: true
      }
    })

    // 检查重复的messageId
    const duplicateMessageIds = await db.email.groupBy({
      by: ['messageId'],
      where: {
        accountId: accountId,
        folder: 'inbox',
        messageId: {
          not: null
        }
      },
      having: {
        messageId: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        messageId: true
      }
    })

    return NextResponse.json({
      account: {
        id: account.id,
        email: account.email
      },
      stats: {
        inboxCount,
        sentCount,
        totalCount
      },
      latestEmails,
      oldestEmails,
      duplicateMessageIds: duplicateMessageIds.length,
      duplicateDetails: duplicateMessageIds
    })
  } catch (error) {
    console.error('调试信息获取失败:', error)
    return NextResponse.json({ error: '调试信息获取失败' }, { status: 500 })
  }
}