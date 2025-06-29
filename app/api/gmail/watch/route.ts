import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getUserGmailService } from '@/lib/gmail'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get Gmail service for user
    const gmailService = await getUserGmailService(user.id)
    
    if (!gmailService) {
      return NextResponse.json({ error: 'Gmail access not configured' }, { status: 400 })
    }

    // Setup watch
    const watchResponse = await gmailService.setupWatch(user.id)

    return NextResponse.json({
      success: true,
      data: watchResponse,
    })
  } catch (error) {
    console.error('Failed to setup Gmail watch:', error)
    return NextResponse.json(
      { error: 'Failed to setup Gmail watch' },
      { status: 500 }
    )
  }
}