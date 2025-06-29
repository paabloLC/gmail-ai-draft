'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FAQ {
  id?: string
  question: string
  answer: string
}

interface Settings {
  businessTone: string
  customInstructions: string
  autoRespond: boolean
  faqs: FAQ[]
}

interface User {
  id: string
  email: string
  name: string
  gmailWatchExpiry: string | null
  historyId: string | null
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({
    businessTone: 'professional',
    customInstructions: '',
    autoRespond: true,
    faqs: []
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newFaq, setNewFaq] = useState<FAQ>({ question: '', answer: '' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/dashboard/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const addFaq = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      setSettings(prev => ({
        ...prev,
        faqs: [...prev.faqs, { ...newFaq, id: Date.now().toString() }]
      }))
      setNewFaq({ question: '', answer: '' })
    }
  }

  const removeFaq = (index: number) => {
    setSettings(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }))
  }

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setSettings(prev => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => 
        i === index ? { ...faq, [field]: value } : faq
      )
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
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
            <div className="flex items-center space-x-2">
              <Link href="/dashboard">
                <Button variant="outline" className="leading-normal">
                  Dashboard
                </Button>
              </Link>
              <Button variant="destructive" onClick={() => signOut()} className="leading-normal">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your AI email assistant preferences</p>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and Gmail integration status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={user?.name || ''} disabled />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Gmail Watch Status</Label>
                  <Input 
                    value={user?.gmailWatchExpiry ? 'Active' : 'Inactive'} 
                    disabled 
                    className={user?.gmailWatchExpiry ? 'text-green-600' : 'text-red-600'}
                  />
                </div>
                <div>
                  <Label>History ID</Label>
                  <Input value={user?.historyId || 'Not set'} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Response Settings */}
          <Card>
            <CardHeader>
              <CardTitle>AI Response Configuration</CardTitle>
              <CardDescription>Configure how the AI responds to emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessTone">Business Tone</Label>
                <select 
                  id="businessTone"
                  className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                  value={settings.businessTone}
                  onChange={(e) => setSettings(prev => ({ ...prev, businessTone: e.target.value }))}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div>
                <Label htmlFor="customInstructions">Custom Instructions</Label>
                <textarea
                  id="customInstructions"
                  className="w-full mt-1 p-2 border border-input rounded-md bg-background min-h-[100px]"
                  placeholder="Add specific instructions for how the AI should respond to emails..."
                  value={settings.customInstructions}
                  onChange={(e) => setSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="relative mt-1">
                    <input
                      type="checkbox"
                      id="autoRespond"
                      checked={settings.autoRespond}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoRespond: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="autoRespond"
                      className={`flex items-center justify-center w-4 h-4 border-2 rounded cursor-pointer transition-all duration-200 ${
                        settings.autoRespond
                          ? 'bg-red-500 border-red-500'
                          : 'bg-white border-gray-300 hover:border-red-300'
                      }`}
                    >
                      {settings.autoRespond && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="autoRespond" className="font-medium">Enable automatic draft creation</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      When enabled, GmailDraft will automatically create draft responses for incoming emails. 
                      Drafts are saved to your Gmail but <strong>never sent automatically</strong> - you always have full control.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Management */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Add common questions and answers to improve AI responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New FAQ */}
              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Add New FAQ</h4>
                <div>
                  <Label htmlFor="newQuestion">Question</Label>
                  <Input
                    id="newQuestion"
                    placeholder="What is your return policy?"
                    value={newFaq.question}
                    onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="newAnswer">Answer</Label>
                  <textarea
                    id="newAnswer"
                    className="w-full mt-1 p-2 border border-input rounded-md bg-background min-h-[80px]"
                    placeholder="We offer a 30-day return policy..."
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={addFaq} 
                  className="w-full inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-0 leading-none"
                >
                  Add FAQ
                </Button>
              </div>

              {/* Existing FAQs */}
              {settings.faqs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Current FAQs</h4>
                  {settings.faqs.map((faq, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                      <div>
                        <Label>Question</Label>
                        <Input
                          value={faq.question}
                          onChange={(e) => updateFaq(index, 'question', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Answer</Label>
                        <textarea
                          className="w-full mt-1 p-2 border border-input rounded-md bg-background min-h-[80px]"
                          value={faq.answer}
                          onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        />
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => removeFaq(index)}
                      >
                        Remove FAQ
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {settings.faqs.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>No FAQs added yet. Add your first FAQ above to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="min-w-[120px] inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-400 text-white font-semibold px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-0 leading-none"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}