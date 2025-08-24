// 邮件缓存服务，替代数据库存储

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
  messageId?: string
  subject: string
  from: string
  to: string
  cc?: string
  bcc?: string
  body: string
  htmlBody?: string
  attachments?: string[]
  folder: string
  isRead: boolean
  isStarred: boolean
  receivedAt: string
  accountId: string
}

class EmailCache {
  private accounts: Map<string, EmailAccount> = new Map()
  private emails: Map<string, Email[]> = new Map() // accountId -> emails[]
  private lastSync: Map<string, Date> = new Map() // accountId -> last sync time

  // 账号管理
  getAccounts(): EmailAccount[] {
    return Array.from(this.accounts.values())
  }

  getAccount(id: string): EmailAccount | undefined {
    return this.accounts.get(id)
  }

  addAccount(account: EmailAccount): void {
    this.accounts.set(account.id, account)
    this.emails.set(account.id, [])
    this.lastSync.set(account.id, new Date())
  }

  updateAccount(account: EmailAccount): void {
    this.accounts.set(account.id, account)
  }

  deleteAccount(id: string): void {
    this.accounts.delete(id)
    this.emails.delete(id)
    this.lastSync.delete(id)
  }

  // 邮件管理
  getEmails(accountId: string, folder: string = 'inbox'): Email[] {
    const accountEmails = this.emails.get(accountId) || []
    return accountEmails.filter(email => email.folder === folder)
  }

  getAllEmails(accountId: string): Email[] {
    return this.emails.get(accountId) || []
  }

  updateEmails(accountId: string, emails: Email[]): void {
    // 获取现有邮件
    const existingEmails = this.emails.get(accountId) || []
    const existingMessageIds = new Set(existingEmails.map(e => e.messageId))
    
    // 只添加不存在的邮件（基于messageId）
    const newEmails = emails.filter(email => 
      email.messageId && !existingMessageIds.has(email.messageId)
    )
    
    // 合并邮件列表，保持现有邮件不变
    this.emails.set(accountId, [...existingEmails, ...newEmails])
    this.lastSync.set(accountId, new Date())
  }

  addEmails(accountId: string, emails: Email[]): void {
    const existingEmails = this.emails.get(accountId) || []
    const existingMessageIds = new Set(existingEmails.map(e => e.messageId))
    
    // 只添加不存在的邮件（基于messageId）
    const newEmails = emails.filter(email => 
      email.messageId && !existingMessageIds.has(email.messageId)
    )
    
    this.emails.set(accountId, [...existingEmails, ...newEmails])
    this.lastSync.set(accountId, new Date())
  }

  updateEmail(accountId: string, emailId: string, updates: Partial<Email>): void {
    const accountEmails = this.emails.get(accountId) || []
    const emailIndex = accountEmails.findIndex(e => e.id === emailId)
    
    if (emailIndex !== -1) {
      accountEmails[emailIndex] = { ...accountEmails[emailIndex], ...updates }
      this.emails.set(accountId, accountEmails)
    }
  }

  deleteEmail(accountId: string, emailId: string): void {
    const accountEmails = this.emails.get(accountId) || []
    const filteredEmails = accountEmails.filter(e => e.id !== emailId)
    this.emails.set(accountId, filteredEmails)
  }

  // 同步状态
  getLastSync(accountId: string): Date | undefined {
    return this.lastSync.get(accountId)
  }

  isSyncNeeded(accountId: string, maxAge: number = 5 * 60 * 1000): boolean {
    const lastSync = this.lastSync.get(accountId)
    if (!lastSync) return true
    
    const now = new Date()
    return now.getTime() - lastSync.getTime() > maxAge
  }

  // 统计信息
  getEmailCount(accountId: string, folder?: string): number {
    if (folder) {
      return this.getEmails(accountId, folder).length
    }
    return this.getAllEmails(accountId).length
  }

  getUnreadCount(accountId: string, folder: string = 'inbox'): number {
    return this.getEmails(accountId, folder).filter(email => !email.isRead).length
  }

  // 清理过期数据
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - maxAge)
    
    for (const [accountId, emails] of this.emails.entries()) {
      const filteredEmails = emails.filter(email => 
        new Date(email.receivedAt) > cutoffDate
      )
      this.emails.set(accountId, filteredEmails)
    }
  }

  // 导出/导入数据（用于持久化）
  export(): string {
    return JSON.stringify({
      accounts: Array.from(this.accounts.entries()),
      emails: Array.from(this.emails.entries()),
      lastSync: Array.from(this.lastSync.entries())
    })
  }

  import(data: string): void {
    try {
      const parsed = JSON.parse(data)
      this.accounts = new Map(parsed.accounts || [])
      this.emails = new Map(parsed.emails || [])
      this.lastSync = new Map(parsed.lastSync || [])
    } catch (error) {
      console.error('导入缓存数据失败:', error)
    }
  }
}

export const emailCache = new EmailCache()