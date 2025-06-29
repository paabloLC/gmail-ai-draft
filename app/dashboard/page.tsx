"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface EmailLog {
  id: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  receivedAt: string;
  intent: string;
  confidence: number;
  responseGenerated: boolean;
  draftCreated: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchSetup, setWatchSetup] = useState(false);
  const [showGmailIntegration, setShowGmailIntegration] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerWatchStatus, setOwnerWatchStatus] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchEmailLogs();
      checkGmailWatchStatus();
      checkGmailIntegrationVisibility();
    }
  }, [session]);

  const checkGmailIntegrationVisibility = async () => {
    try {
      const response = await fetch('/api/owner');
      const data = await response.json();
      setShowGmailIntegration(data.showGmailIntegration);
      setIsOwner(data.isOwner);
      setOwnerWatchStatus(data.ownerWatchStatus);
    } catch (error) {
      console.error('Error checking Gmail Integration visibility:', error);
      setShowGmailIntegration(false);
      setIsOwner(false);
      setOwnerWatchStatus(null);
    }
  };

  const checkGmailWatchStatus = async () => {
    try {
      const response = await fetch("/api/dashboard/settings");
      const data = await response.json();

      if (data.user?.gmailWatchExpiry) {
        const expiryDate = new Date(data.user.gmailWatchExpiry);
        const now = new Date();
        setWatchSetup(expiryDate > now);
      } else {
        setWatchSetup(false);
      }
    } catch (error) {
      console.error("Failed to check Gmail watch status:", error);
      setWatchSetup(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const response = await fetch("/api/dashboard/logs");
      const data = await response.json();
      setEmailLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch email logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupGmailWatch = async () => {
    try {
      const response = await fetch("/api/gmail/watch", {
        method: "POST",
      });

      if (response.ok) {
        setWatchSetup(true);
      }
    } catch (error) {
      console.error("Failed to setup Gmail watch:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col justify-center mt-1">
                  <span className="text-2xl font-bold text-gray-900 leading-none">
                    GmailDraft
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    AI Email Assistant
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session.user?.image || ""}
                    alt={session.user?.name || "User avatar"}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="text-xs bg-red-100 text-red-800">
                    {session.user?.name
                      ? session.user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
                      : session.user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {session.user?.name || session.user?.email}
                </span>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="outline" className="leading-normal">
                  Settings
                </Button>
              </Link>
              <Button variant="destructive" onClick={() => signOut()} className="leading-normal">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Monitor your AI email assistant activity
          </p>
        </div>

        <div className="space-y-6">
          {/* Gmail Integration Status */}
          {showGmailIntegration && (
          <Card>
            <CardHeader>
              <CardTitle>Gmail Integration</CardTitle>
              <CardDescription>
                Monitor your Gmail connection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!watchSetup ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <svg
                        className="h-5 w-5 text-amber-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        Setup Required
                      </h4>
                      <p className="text-sm text-amber-700 mb-3">
                        To enable automatic email processing, you need to setup Gmail Watch. This allows GmailDraft to:
                      </p>
                      <ul className="text-sm text-amber-700 mb-4 ml-4 space-y-1">
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>Monitor your inbox for new emails in real-time</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>Automatically analyze email intent using AI</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>Generate intelligent draft responses and save them to Gmail</span>
                        </li>
                        <li className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>Work silently in the background without manual intervention</span>
                        </li>
                      </ul>
                      <p className="text-xs text-amber-600 mb-4">
                        <strong>Note:</strong> This setup is secure and only grants permission to read emails and create drafts. No emails are sent automatically.
                      </p>
                      <Button 
                        onClick={setupGmailWatch}
                        className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-0 leading-none"
                      >
                        <span className="mt-1">Setup Gmail Watch</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <svg
                        className="h-5 w-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-green-800 mb-1">
                        Gmail Watch Active
                      </h4>
                      <p className="text-sm text-green-700">
                        Your Gmail is being monitored. New emails will be
                        processed automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Status Notification for Non-Owner Users */}
          {!isOwner && ownerWatchStatus !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Gmail Agent Status</CardTitle>
                <CardDescription>
                  Current status of the AI email processing agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ownerWatchStatus ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="h-5 w-5 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-green-800 mb-1">
                          Agent Active
                        </h4>
                        <p className="text-sm text-green-700">
                          The Gmail agent is running and processing emails automatically. 
                          Your emails will be analyzed and draft responses will be created.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="h-5 w-5 text-amber-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 mb-1">
                          Agent Inactive
                        </h4>
                        <p className="text-sm text-amber-700">
                          The Gmail agent is not yet configured. Please contact the system administrator 
                          to set up Gmail Watch integration for automatic email processing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Legend */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Status Legend</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Draft
                </span>
                <span className="text-xs text-gray-600">Response created and saved to Gmail drafts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  ⚠ No response
                </span>
                <span className="text-xs text-gray-600">Email understood but no response needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  ✗ Failed
                </span>
                <span className="text-xs text-gray-600">Response generation failed or confidence too low</span>
              </div>
            </div>
          </div>

          {/* Email Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent email activity</CardTitle>
              <CardDescription>
                Emails processed by GmailDraft agent
              </CardDescription>
            </CardHeader>
            <CardContent>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                ) : emailLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      No emails processed yet. Make sure Gmail watch is setup and
                      send yourself a test email.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailLogs.map((log) => (
                      <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex gap-4">
                          {/* Child 1: Status - Centered vertically */}
                          <div className="flex items-center w-24">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              log.draftCreated 
                                ? 'bg-green-100 text-green-800' 
                                : log.responseGenerated 
                                  ? 'bg-red-100 text-red-800'
                                  : log.confidence && log.confidence > 0.8
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                              {log.draftCreated ? '✓ Draft' : log.responseGenerated ? '✗ Failed' : log.confidence && log.confidence > 0.8 ? '⚠ No response' : '✗ Failed'}
                            </span>
                          </div>
                          
                          {/* Child 2: Subject above, From below */}
                          <div className="w-64 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {log.subject}
                            </div>
                            <div className="text-xs mt-1">
                              <span className="font-semibold text-gray-700">
                                {(() => {
                                  const name = log.fromName || log.fromEmail.split('@')[0];
                                  return name.includes('<') ? name.split('<')[0].trim() : name;
                                })()}
                              </span>
                              <span className="text-gray-400 mx-1">|</span>
                              <span className="text-xs font-light text-gray-500">
                                {(() => {
                                  const email = log.fromEmail;
                                  if (email.includes('<') && email.includes('>')) {
                                    return email.split('<')[1].split('>')[0];
                                  }
                                  return email;
                                })()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Child 3: Intent - Most space */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-700">
                              {log.intent}
                            </div>
                          </div>
                          
                          {/* Child 4: Date above, Confidence below */}
                          <div className="w-24 text-right">
                            <div className="text-xs text-gray-500">
                              {new Date(log.receivedAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {Math.round(log.confidence * 100)}% confidence
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
