import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with FAQs
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        faqs: {
          select: {
            id: true,
            question: true,
            answer: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const settings = {
      businessTone: user.businessTone,
      customInstructions: user.customInstructions || '',
      autoRespond: user.autoRespond,
      faqs: user.faqs,
    }

    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      gmailWatchExpiry: user.gmailWatchExpiry,
      historyId: user.historyId,
    }

    return NextResponse.json({ settings, user: userInfo })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessTone, customInstructions, autoRespond, faqs } = await request.json()

    // Get user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user settings
    await db.user.update({
      where: { id: user.id },
      data: {
        businessTone,
        customInstructions,
        autoRespond,
      },
    })

    // Delete existing FAQs and create new ones
    await db.fAQ.deleteMany({
      where: { userId: user.id },
    })

    if (faqs && faqs.length > 0) {
      await db.fAQ.createMany({
        data: faqs.map((faq: any) => ({
          question: faq.question,
          answer: faq.answer,
          userId: user.id,
        })),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}