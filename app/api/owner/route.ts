import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        showGmailIntegration: false,
        isOwner: false,
        ownerWatchStatus: null 
      });
    }

    const multiUserMode = process.env.MULTI_USER_MODE === 'true';
    const ownerEmail = process.env.OWNER_EMAIL;
    const isOwner = session.user.email === ownerEmail;
    
    if (!multiUserMode) {
      // Self-hosted mode: show Gmail Integration for everyone
      return NextResponse.json({ 
        showGmailIntegration: true,
        isOwner: true, // In self-hosted mode, everyone is effectively an owner
        ownerWatchStatus: null 
      });
    }

    // Multi-user mode
    if (isOwner) {
      // Owner sees the full Gmail Integration panel
      return NextResponse.json({ 
        showGmailIntegration: true,
        isOwner: true,
        ownerWatchStatus: null 
      });
    } else {
      // Non-owner: get owner's watch status
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const owner = await prisma.user.findUnique({
          where: { email: ownerEmail },
          select: { gmailWatchExpiry: true }
        });

        const ownerWatchActive = owner?.gmailWatchExpiry ? 
          new Date(owner.gmailWatchExpiry) > new Date() : false;

        return NextResponse.json({ 
          showGmailIntegration: false,
          isOwner: false,
          ownerWatchStatus: ownerWatchActive 
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  } catch (error) {
    console.error('Error checking Gmail Integration visibility:', error);
    return NextResponse.json({ 
      showGmailIntegration: false,
      isOwner: false,
      ownerWatchStatus: null 
    });
  }
}