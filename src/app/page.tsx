'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Mail, 
  Inbox, 
  Send, 
  Star, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Settings, 
  Search,
  Reply,
  Edit3,
  User,
  MailOpen,
  Paperclip,
  Clock,
  Filter,
  CheckCircle,
  XCircle,
  Bell,
  BellOff
} from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  password: string
  imapServer: string
  imapPort: number
  smtpServer: string
  smtpPort: number
  isActive: boolean
}

interface Email {
  id: string
  subject: string
  from: string
  to: string
  body: string
  htmlBody?: string
  folder: string
  isRead: boolean
  isStarred: boolean
  receivedAt: string
  accountId: string
  messageId?: string
  cc?: string
  bcc?: string
  attachments?: string[]
}

export default function Home() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'subject'>('date')
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [newAccount, setNewAccount] = useState({
    email: '',
    password: '',
    imapServer: 'imap.email.cn',
    imapPort: 993,
    smtpServer: 'smtp.email.cn',
    smtpPort: 465
  })
  const [composeEmail, setComposeEmail] = useState({
    to: '',
    subject: '',
    body: '',
    htmlBody: '',
    cc: '',
    bcc: ''
  })
  const [accountLoading, setAccountLoading] = useState<{[key: string]: boolean}>({})
  const [prevSelectedAccount, setPrevSelectedAccount] = useState<string>('')
  const [accountEmailCounts, setAccountEmailCounts] = useState<{[key: string]: number}>({})
  const [newEmailNotifications, setNewEmailNotifications] = useState<Email[]>([])
  const [showNotification, setShowNotification] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(false) // 新邮件通知开关，默认关闭

  // 显示toast提示
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' })
    }, 3000)
  }

  // 获取每个账号的邮件数量
  const fetchAccountEmailCounts = async () => {
    try {
      const counts: {[key: string]: number} = {}
      
      for (const account of accounts) {
        const response = await fetch(`/api/emails?accountId=${account.id}&folder=inbox`)
        if (response.ok) {
          const emails = await response.json()
          counts[account.id] = emails.length
        }
      }
      
      setAccountEmailCounts(counts)
    } catch (error) {
      console.error('获取账号邮件数量失败:', error)
    }
  }

  // 当账号列表变化时，获取邮件数量
  useEffect(() => {
    if (accounts.length > 0) {
      fetchAccountEmailCounts()
    }
  }, [accounts])

  // 当切换账号时，清空选中的邮件
  useEffect(() => {
    if (selectedAccount !== prevSelectedAccount) {
      setSelectedEmail(null)
      setPrevSelectedAccount(selectedAccount)
    }
  }, [selectedAccount, prevSelectedAccount])

  // 获取邮件账号列表
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
        if (data.length > 0 && !selectedAccount) {
          setSelectedAccount(data[0].id)
        }
      }
    } catch (error) {
      console.error('获取邮件账号失败:', error)
    }
  }

  // 初始化时获取账号
  useEffect(() => {
    fetchAccounts()
  }, [])

  // 自动刷新邮件
  useEffect(() => {
    if (selectedAccount) {
      let refreshCount = 0
      const interval = setInterval(() => {
        refreshCount++
        // 每3次普通刷新后，执行一次获取最新邮件
        if (refreshCount % 3 === 0) {
          console.log('执行获取最新邮件...')
          fetchLatestEmailsQuiet()
        } else {
          console.log('执行普通刷新...')
          fetchEmails()
        }
      }, 8000) // 每8秒刷新一次
      return () => clearInterval(interval)
    }
  }, [selectedAccount])

  const fetchEmails = async () => {
    if (!selectedAccount) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount,
        folder: 'inbox',
        search: searchTerm,
        sortBy: sortBy
      })
      
      const response = await fetch(`/api/emails?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEmails(data)
      }
    } catch (error) {
      console.error('获取邮件失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshEmails = async (accountId?: string) => {
    const targetAccountId = accountId || selectedAccount
    if (!targetAccountId) return
    
    setAccountLoading(prev => ({ ...prev, [targetAccountId]: true }))
    try {
      const response = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: targetAccountId })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`刷新成功: ${result.message}, 新邮件数量: ${result.newEmailsCount}, 总邮件数: ${result.totalEmails}`)
        
        // 如果刷新的是当前选中的账号，重新获取所有邮件（包括缓存中的邮件）
        if (targetAccountId === selectedAccount) {
          await fetchEmails()
        }
        
        // 如果有新邮件，显示通知（仅在通知开启时）
        if (result.newEmailsCount > 0 && enableEmailNotifications) {
          console.log(`获取到 ${result.newEmailsCount} 封新邮件，显示通知`)
          // 刷新邮件数量
          fetchAccountEmailCounts()
          
          // 显示新邮件通知
          if (result.emails && result.emails.length > 0) {
            setNewEmailNotifications(result.emails)
            setShowNotification(true)
            
            // 3秒后自动隐藏通知
            setTimeout(() => {
              setShowNotification(false)
            }, 3000)
          }
        } else if (result.newEmailsCount > 0) {
          console.log(`获取到 ${result.newEmailsCount} 封新邮件，但通知已关闭`)
          // 刷新邮件数量
          fetchAccountEmailCounts()
        }
      } else {
        const error = await response.json()
        console.error('刷新失败:', error.error)
      }
    } catch (error) {
      console.error('刷新邮件失败:', error)
    } finally {
      setAccountLoading(prev => ({ ...prev, [targetAccountId]: false }))
    }
  }

  const forceRefreshEmails = async () => {
    const confirmed = confirm('强制刷新将从服务器重新获取所有账号的最新邮件数据，确定要继续吗？')
    if (!confirmed) return
    
    // 设置所有账号的加载状态
    const loadingStates: {[key: string]: boolean} = {}
    accounts.forEach(account => {
      loadingStates[account.id] = true
    })
    setAccountLoading(prev => ({ ...prev, ...loadingStates }))
    
    try {
      const response = await fetch('/api/refresh-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`全部账号强制刷新成功: ${result.message}`)
        console.log(`成功刷新 ${result.successCount} 个账号，失败 ${result.failureCount} 个账号，总共 ${result.totalEmails} 封邮件`)
        
        // 如果当前选中的账号在刷新结果中，重新获取该账号的邮件
        if (selectedAccount) {
          await fetchEmails()
        }
        
        // 刷新所有账号的邮件数量
        await fetchAccountEmailCounts()
        
        // 显示详细的刷新结果
        let resultMessage = `全部账号强制刷新完成！\n\n`
        resultMessage += `总账号数: ${result.totalAccounts}\n`
        resultMessage += `成功刷新: ${result.successCount} 个账号\n`
        resultMessage += `失败刷新: ${result.failureCount} 个账号\n`
        resultMessage += `总邮件数: ${result.totalEmails} 封\n\n`
        
        if (result.results && result.results.length > 0) {
          resultMessage += `详细结果:\n`
          result.results.forEach((r: any) => {
            if (r.success) {
              resultMessage += `✓ ${r.email}: ${r.emailCount} 封邮件\n`
            } else {
              resultMessage += `✗ ${r.email}: ${r.error}\n`
            }
          })
        }
        
        alert(resultMessage)
      } else {
        const error = await response.json()
        console.error('全部账号强制刷新失败:', error.error)
        alert(`全部账号强制刷新失败: ${error.error}`)
      }
    } catch (error) {
      console.error('全部账号强制刷新失败:', error)
      alert('全部账号强制刷新失败，请检查网络连接')
    } finally {
      // 清除所有账号的加载状态
      const clearLoadingStates: {[key: string]: boolean} = {}
      accounts.forEach(account => {
        clearLoadingStates[account.id] = false
      })
      setAccountLoading(prev => ({ ...prev, ...clearLoadingStates }))
    }
  }

  const fetchAllEmails = async () => {
    if (!selectedAccount) return
    
    const confirmed = confirm('获取所有邮件将从服务器重新获取全部邮件数据，确定要继续吗？')
    if (!confirmed) return
    
    setAccountLoading(prev => ({ ...prev, [selectedAccount]: true }))
    try {
      const response = await fetch('/api/fetch-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: selectedAccount })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`获取所有邮件成功: ${result.message}, 邮件数量: ${result.count}`)
        
        // 直接使用从服务器返回的邮件数据
        if (result.emails) {
          setEmails(result.emails)
        }
        
        // 刷新邮件数量
        fetchAccountEmailCounts()
        
        alert(`获取所有邮件成功！\n获取到 ${result.count} 封邮件`)
      } else {
        const error = await response.json()
        console.error('获取所有邮件失败:', error.error)
        alert(`获取所有邮件失败: ${error.error}`)
      }
    } catch (error) {
      console.error('获取所有邮件失败:', error)
      alert('获取所有邮件失败，请检查网络连接')
    } finally {
      setAccountLoading(prev => ({ ...prev, [selectedAccount]: false }))
    }
  }

  const fetchLatestEmailsQuiet = async () => {
    if (!selectedAccount) return
    
    try {
      const response = await fetch('/api/fetch-latest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: selectedAccount })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`静默获取最新邮件成功: ${result.message}, 新邮件数量: ${result.newEmailsCount || result.count}`)
        
        // 重新获取所有邮件（包括缓存中的邮件）
        await fetchEmails()
        
        // 刷新邮件数量
        fetchAccountEmailCounts()
        
        // 如果有新邮件，显示通知（仅在通知开启时）
        if ((result.newEmailsCount || result.count) > 0 && enableEmailNotifications) {
          showToast(`获取到 ${result.newEmailsCount || result.count} 封最新邮件`, 'success')
        } else if ((result.newEmailsCount || result.count) > 0) {
          console.log(`获取到 ${result.newEmailsCount || result.count} 封最新邮件，但通知已关闭`)
        }
      } else {
        const error = await response.json()
        console.error('静默获取最新邮件失败:', error.error)
      }
    } catch (error) {
      console.error('静默获取最新邮件失败:', error)
    }
  }

  const fetchLatestEmails = async () => {
    if (!selectedAccount) return
    
    setAccountLoading(prev => ({ ...prev, [selectedAccount]: true }))
    try {
      const response = await fetch('/api/fetch-latest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: selectedAccount })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`获取最新邮件成功: ${result.message}, 新邮件数量: ${result.newEmailsCount || result.count}`)
        
        // 重新获取所有邮件（包括缓存中的邮件）
        await fetchEmails()
        
        // 刷新邮件数量
        fetchAccountEmailCounts()
        
        alert(`获取最新邮件成功！\n获取到 ${result.newEmailsCount || result.count} 封最新邮件`)
      } else {
        const error = await response.json()
        console.error('获取最新邮件失败:', error.error)
        alert(`获取最新邮件失败: ${error.error}`)
      }
    } catch (error) {
      console.error('获取最新邮件失败:', error)
      alert('获取最新邮件失败，请检查网络连接')
    } finally {
      setAccountLoading(prev => ({ ...prev, [selectedAccount]: false }))
    }
  }

  const debugEmails = async () => {
    if (!selectedAccount) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/debug?accountId=${selectedAccount}`)
      if (response.ok) {
        const data = await response.json()
        console.log('调试信息:', data)
        alert(`调试信息:\n收件箱邮件数: ${data.stats.inboxCount}\n已发送邮件数: ${data.stats.sentCount}\n总邮件数: ${data.stats.totalCount}\n重复邮件数: ${data.duplicateMessageIds}`)
      } else {
        const error = await response.json()
        console.error('调试失败:', error.error)
        alert(`调试失败: ${error.error}`)
      }
    } catch (error) {
      console.error('调试失败:', error)
      alert('调试失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedAccount) {
      fetchEmails()
    }
  }, [selectedAccount, searchTerm, sortBy])

  const filteredEmails = emails
    .filter(email => 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      }
      return a.subject.localeCompare(b.subject)
    })

  const handleAddAccount = async () => {
    if (newAccount.email && newAccount.password) {
      try {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAccount)
        })
        
        if (response.ok) {
          await fetchAccounts()
          setNewAccount({
            email: '',
            password: '',
            imapServer: 'imap.email.cn',
            imapPort: 993,
            smtpServer: 'smtp.email.cn',
            smtpPort: 465
          })
          setIsAddAccountOpen(false)
        }
      } catch (error) {
        console.error('添加账号失败:', error)
      }
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchAccounts()
        if (selectedAccount === id && accounts.length > 1) {
          setSelectedAccount(accounts.find(a => a.id !== id)?.id || '')
        }
      }
    } catch (error) {
      console.error('删除账号失败:', error)
    }
  }

  const handleSendEmail = async () => {
    if (!composeEmail.to || !composeEmail.subject || !composeEmail.body || !selectedAccount) {
      showToast('请填写收件人、主题和内容', 'error')
      return
    }

    // 显示发送中提示，但不阻塞界面
    showToast('邮件发送中...', 'success')
    
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: composeEmail.to,
          subject: composeEmail.subject,
          body: composeEmail.body,
          htmlBody: composeEmail.htmlBody,
          cc: composeEmail.cc,
          bcc: composeEmail.bcc,
          accountId: selectedAccount
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        const account = accounts.find(a => a.id === selectedAccount)
        const senderEmail = account ? account.email : '未知账号'
        const sendTime = new Date().toLocaleString()
        
        // 清空表单
        setComposeEmail({
          to: '',
          subject: '',
          body: '',
          htmlBody: '',
          cc: '',
          bcc: ''
        })
        
        // 显示发送成功提示
        showToast(`邮件发送成功！\n发件人: ${senderEmail}\n收件人: ${composeEmail.to}`, 'success')
        
        // 关闭撰写邮件弹窗
        setIsComposeOpen(false)
        
        // 在后台检查新邮件，不阻塞用户操作
        setTimeout(async () => {
          console.log('后台检查最新邮件...')
          try {
            const response = await fetch('/api/check-latest', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ accountId: selectedAccount })
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log(`后台检查结果: ${result.message}, 数量: ${result.count}`)
              if (result.count > 0) {
                // 如果有新邮件，静默刷新邮件列表
                await fetchEmails()
                if (enableEmailNotifications) {
                  showToast(`收到 ${result.count} 封新邮件！`, 'success')
                }
              }
            }
          } catch (error) {
            console.error('后台检查最新邮件失败:', error)
          }
        }, 3000)
        
      } else {
        console.error('发送邮件失败:', result.error)
        showToast(`发送失败: ${result.error || '未知错误'}`, 'error')
      }
    } catch (error) {
      console.error('发送邮件失败:', error)
      showToast('发送邮件失败，请检查网络连接', 'error')
    }
  }

  const checkLatestEmails = async (accountId: string) => {
    try {
      const response = await fetch('/api/check-latest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`检查最新邮件结果: ${result.message}, 数量: ${result.count}`)
        
        if (result.count > 0) {
          // 如果有新邮件，刷新邮件列表
          await fetchEmails()
          if (enableEmailNotifications) {
            showToast(`收到 ${result.count} 封新邮件！`, 'success')
          } else {
            console.log(`收到 ${result.count} 封新邮件，但通知已关闭`)
          }
        }
      } else {
        const error = await response.json()
        console.error('检查最新邮件失败:', error.error)
      }
    } catch (error) {
      console.error('检查最新邮件失败:', error)
    }
  }

  const handleReply = () => {
    if (!selectedEmail) return
    
    setComposeEmail({
      to: selectedEmail.from,
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n---原始邮件---\n发件人: ${selectedEmail.from}\n时间: ${new Date(selectedEmail.receivedAt).toLocaleString()}\n\n${selectedEmail.body}`,
      htmlBody: '',
      cc: '',
      bcc: ''
    })
    setIsComposeOpen(true)
  }

  const handleDeleteEmail = async () => {
    if (!selectedEmail) return
    
    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // 从邮件列表中删除该邮件
        setEmails(prev => prev.filter(email => email.id !== selectedEmail.id))
        // 清空选中的邮件
        setSelectedEmail(null)
      } else {
        const error = await response.json()
        console.error('删除邮件失败:', error.error)
      }
    } catch (error) {
      console.error('删除邮件失败:', error)
    }
  }

  const getAccountIcon = (email: string) => {
    const username = email.split('@')[0].toLowerCase()
    
    // 根据邮箱用户名返回不同的图标和颜色
    if (username.includes('steven')) {
      return { 
        icon: '👨‍💼', 
        color: 'from-blue-500 to-blue-700',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      }
    } else if (username.includes('18')) {
      return { 
        icon: '🎯', 
        color: 'from-red-500 to-red-700',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      }
    } else if (username.includes('168')) {
      return { 
        icon: '💎', 
        color: 'from-green-500 to-green-700',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      }
    } else if (username.includes('1688')) {
      return { 
        icon: '🏆', 
        color: 'from-yellow-500 to-yellow-700',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      }
    } else if (username.includes('99')) {
      return { 
        icon: '⭐', 
        color: 'from-purple-500 to-purple-700',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
      }
    } else {
      return { 
        icon: '📧', 
        color: 'from-gray-500 to-gray-700',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      }
    }
  }

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`
    } else if (diffInHours < 48) {
      return '昨天'
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                多账号邮件客户端HH@by测试组🟢Steven
              </h1>
              <p className="text-sm text-gray-600">多账号邮件管理系统</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 新邮件通知开关 */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
              {enableEmailNotifications ? (
                <Bell className="w-4 h-4 text-blue-600" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
              <Switch
                checked={enableEmailNotifications}
                onCheckedChange={setEnableEmailNotifications}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className={`text-sm font-medium ${enableEmailNotifications ? 'text-blue-600' : 'text-gray-500'}`}>
                新邮件通知
              </span>
            </div>
            
            {/* 账号下拉选择框 */}
            <Select value={selectedAccount} onValueChange={(value) => {
              setSelectedAccount(value)
              refreshEmails(value)
            }}>
              <SelectTrigger className="w-64 rounded-full">
                <SelectValue placeholder="选择邮箱账号" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => {
                  const accountIcon = getAccountIcon(account.email)
                  return (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{accountIcon.icon}</span>
                        <span>{account.email}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {accountEmailCounts[account.id] || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => refreshEmails()} 
              disabled={isLoading || accountLoading[selectedAccount]}
              className="bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading || accountLoading[selectedAccount] ? 'animate-spin' : ''}`} />
              刷新邮件
            </Button>
            <Button 
              onClick={() => debugEmails()} 
              disabled={isLoading || accountLoading[selectedAccount]}
              variant="outline"
              className="rounded-full shadow-lg"
            >
              <Settings className={`w-4 h-4 mr-2`} />
              调试
            </Button>
            <Button 
              onClick={() => forceRefreshEmails()} 
              disabled={isLoading || Object.values(accountLoading).some(loading => loading)}
              variant="destructive"
              className="rounded-full shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${Object.values(accountLoading).some(loading => loading) ? 'animate-spin' : ''}`} />
              强制刷新全部
            </Button>
            <Button 
              onClick={() => fetchLatestEmails()} 
              disabled={isLoading || accountLoading[selectedAccount]}
              variant="default"
              className="rounded-full shadow-lg bg-green-500 hover:bg-green-600"
            >
              <Mail className={`w-4 h-4 mr-2`} />
              获取最新邮件
            </Button>
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-lg">
                  <Edit3 className="w-4 h-4 mr-2" />
                  写邮件
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-0 shadow-lg max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    撰写新邮件
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="from">发件人</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="rounded-full">
                        <SelectValue placeholder="选择发件人账号" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => {
                          const accountIcon = getAccountIcon(account.email)
                          return (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{accountIcon.icon}</span>
                                <span>{account.email}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="to">收件人</Label>
                    <div className="flex gap-2">
                      <Input
                        id="to"
                        type="email"
                        value={composeEmail.to}
                        onChange={(e) => setComposeEmail({...composeEmail, to: e.target.value})}
                        placeholder="请输入收件人邮箱"
                        className="rounded-full flex-1"
                      />
                      <Select onValueChange={(value) => setComposeEmail({...composeEmail, to: value})}>
                        <SelectTrigger className="w-40 rounded-full">
                          <SelectValue placeholder="选择账号" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.email}>
                              {account.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">主题</Label>
                    <Input
                      id="subject"
                      value={composeEmail.subject}
                      onChange={(e) => setComposeEmail({...composeEmail, subject: e.target.value})}
                      placeholder="请输入邮件主题"
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="body">内容</Label>
                    <Textarea
                      id="body"
                      value={composeEmail.body}
                      onChange={(e) => setComposeEmail({...composeEmail, body: e.target.value})}
                      placeholder="请输入邮件内容"
                      className="min-h-32 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cc">抄送</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cc"
                          type="email"
                          value={composeEmail.cc}
                          onChange={(e) => setComposeEmail({...composeEmail, cc: e.target.value})}
                          placeholder="抄送邮箱"
                          className="rounded-full flex-1"
                        />
                        <Select onValueChange={(value) => setComposeEmail({...composeEmail, cc: value})}>
                          <SelectTrigger className="w-32 rounded-full">
                            <SelectValue placeholder="选择" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.email}>
                                {account.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bcc">密送</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bcc"
                          type="email"
                          value={composeEmail.bcc}
                          onChange={(e) => setComposeEmail({...composeEmail, bcc: e.target.value})}
                          placeholder="密送邮箱"
                          className="rounded-full flex-1"
                        />
                        <Select onValueChange={(value) => setComposeEmail({...composeEmail, bcc: value})}>
                          <SelectTrigger className="w-32 rounded-full">
                            <SelectValue placeholder="选择" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.email}>
                                {account.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>发送账号: {accounts.find(a => a.id === selectedAccount)?.email}</span>
                  </div>
                  <Button 
                    onClick={handleSendEmail}
                    className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    发送邮件
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-400 to-indigo-400 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  添加账号
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-0 shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    添加邮件账号
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">邮箱地址</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAccount.email}
                      onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                      placeholder="请输入邮箱地址"
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                      placeholder="请输入密码"
                      className="rounded-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="imapServer">IMAP服务器</Label>
                      <Input
                        id="imapServer"
                        value={newAccount.imapServer}
                        onChange={(e) => setNewAccount({...newAccount, imapServer: e.target.value})}
                        className="rounded-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="imapPort">IMAP端口</Label>
                      <Input
                        id="imapPort"
                        type="number"
                        value={newAccount.imapPort}
                        onChange={(e) => setNewAccount({...newAccount, imapPort: parseInt(e.target.value)})}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtpServer">SMTP服务器</Label>
                      <Input
                        id="smtpServer"
                        value={newAccount.smtpServer}
                        onChange={(e) => setNewAccount({...newAccount, smtpServer: e.target.value})}
                        className="rounded-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtpPort">SMTP端口</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={newAccount.smtpPort}
                        onChange={(e) => setNewAccount({...newAccount, smtpPort: parseInt(e.target.value)})}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddAccount}
                    className="w-full bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-full"
                  >
                    添加账号
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧账号列表 */}
          <div className="lg:col-span-4">
            <Card className="rounded-2xl border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    邮箱账号
                  </CardTitle>
                  <Badge variant="secondary" className="bg-pink-100 text-pink-600 rounded-full">
                    {accounts.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-2 p-4">
                    {accounts.map((account) => {
                      const accountIcon = getAccountIcon(account.email)
                      return (
                        <div
                          key={account.id}
                          className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                            selectedAccount === account.id
                              ? `${accountIcon.bgColor} ${accountIcon.borderColor} border-2 shadow-lg transform scale-105`
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedAccount(account.id)
                            refreshEmails(account.id)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 bg-gradient-to-r ${accountIcon.color} rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-200`}>
                                <span className="text-xl">{accountIcon.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm truncate ${selectedAccount === account.id ? accountIcon.textColor : 'text-gray-900'}`}>
                                  {account.email}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${account.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                    <p className={`text-xs ${selectedAccount === account.id ? accountIcon.textColor : 'text-gray-500'}`}>
                                      {account.isActive ? '在线' : '离线'}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs rounded-full ${selectedAccount === account.id ? accountIcon.bgColor + ' ' + accountIcon.textColor : 'bg-gray-100 text-gray-600'}`}
                                  >
                                    {accountEmailCounts[account.id] || 0}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  refreshEmails(account.id)
                                }}
                                disabled={accountLoading[account.id]}
                                className={`${selectedAccount === account.id ? accountIcon.textColor : 'text-blue-400'} hover:text-blue-600 hover:bg-blue-50 rounded-full`}
                              >
                                <RefreshCw className={`w-3 h-3 ${accountLoading[account.id] ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteAccount(account.id)
                                }}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 中间邮件列表 */}
          <div className="lg:col-span-4">
            <Card className="rounded-2xl border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      邮件列表
                    </CardTitle>
                    <Badge variant="outline" className="rounded-full">
                      {filteredEmails.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="搜索邮件..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-full w-40"
                      />
                    </div>
                    <Select value={sortBy} onValueChange={(value: 'date' | 'subject') => setSortBy(value)}>
                      <SelectTrigger className="w-28 rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">时间</SelectItem>
                        <SelectItem value="subject">主题</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-2 p-4">
                    {filteredEmails.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MailOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>暂无邮件</p>
                      </div>
                    ) : (
                      filteredEmails.map((email) => (
                        <div
                          key={email.id}
                          className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                            selectedEmail?.id === email.id
                              ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-200 shadow-md'
                              : 'hover:bg-gray-50'
                          } ${!email.isRead ? 'bg-blue-50/50' : ''}`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-300 to-indigo-300 flex-shrink-0">
                                <AvatarFallback className="text-white text-xs">
                                  {getInitials(email.from)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${!email.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {email.from}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(email.receivedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {email.attachments && email.attachments.length > 0 && (
                                <Paperclip className="w-3 h-3 text-gray-400" />
                              )}
                              {email.isStarred && (
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              )}
                              {!email.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm mb-1 truncate ${!email.isRead ? 'font-semibold text-blue-900' : 'text-gray-900'}`}>
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {email.body.substring(0, 100)}
                            {email.body.length > 100 && '...'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 右侧邮件内容 */}
          <div className="lg:col-span-4">
            <Card className="rounded-2xl border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    邮件内容
                  </CardTitle>
                  {selectedEmail && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleReply}
                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                      >
                        <Reply className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full"
                      >
                        <Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteEmail}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="p-6">
                    {selectedEmail ? (
                      <div className="space-y-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-14 h-14 bg-gradient-to-r from-blue-400 to-indigo-400 flex-shrink-0">
                            <AvatarFallback className="text-white font-semibold text-lg">
                              {getInitials(selectedEmail.from)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">发件人:</span>
                              </p>
                              <p className="font-bold text-gray-900 text-lg">{selectedEmail.from}</p>
                              {selectedEmail.isStarred && (
                                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">收件人:</span> {selectedEmail.to}
                              </p>
                              {selectedEmail.cc && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">抄送:</span> {selectedEmail.cc}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">时间:</span> {new Date(selectedEmail.receivedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-xl font-bold mb-6 text-gray-900 leading-relaxed">
                            {selectedEmail.subject}
                          </h3>
                          
                          {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-2">附件:</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEmail.attachments.map((attachment, index) => (
                                  <Badge key={index} variant="outline" className="text-xs p-2">
                                    <Paperclip className="w-3 h-3 mr-1" />
                                    {attachment}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="prose prose-sm max-w-none">
                            {selectedEmail.htmlBody ? (
                              <div 
                                className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm"
                                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                              />
                            ) : (
                              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                                {selectedEmail.body}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-96 text-gray-400">
                        <div className="text-center">
                          <MailOpen className="w-20 h-20 mx-auto mb-6 opacity-50" />
                          <p className="text-lg font-medium mb-2">选择一封邮件查看内容</p>
                          <p className="text-sm">点击左侧邮件列表中的邮件即可查看详细内容</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 新邮件通知浮窗 */}
      {showNotification && newEmailNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 mb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">新邮件通知</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNotification(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {newEmailNotifications.map((email, index) => (
                <div
                  key={email.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setSelectedAccount(email.accountId)
                    setSelectedEmail(email)
                    setShowNotification(false)
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-300 to-indigo-300 flex-shrink-0">
                      <AvatarFallback className="text-white text-xs">
                        {getInitials(email.from)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{email.from}</p>
                      <p className="text-xs text-gray-500">{formatDate(email.receivedAt)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1 truncate">{email.subject}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {email.body.substring(0, 100)}
                    {email.body.length > 100 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast提示 */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}