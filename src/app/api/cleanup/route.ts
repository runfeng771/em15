import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // 删除所有现有的邮件数据
    const deletedEmails = await db.email.deleteMany({})
    
    console.log(`已删除 ${deletedEmails.count} 封模拟邮件`)
    
    return NextResponse.json({ 
      message: '模拟邮件清理成功',
      deletedCount: deletedEmails.count
    })
  } catch (error) {
    console.error('清理模拟邮件失败:', error)
    return NextResponse.json({ error: '清理模拟邮件失败' }, { status: 500 })
  }
}