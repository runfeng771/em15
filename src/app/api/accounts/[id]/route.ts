import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.emailAccount.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除邮件账号失败:', error)
    return NextResponse.json({ error: '删除邮件账号失败' }, { status: 500 })
  }
}