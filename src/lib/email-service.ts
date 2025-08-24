import Imap from 'imap'
import nodemailer from 'nodemailer'
import { simpleParser } from 'mailparser'
import { emailCache } from './cache'

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

interface EmailData {
  subject: string
  from: string
  to: string
  cc?: string
  bcc?: string
  body: string
  htmlBody?: string
  attachments?: string[]
  messageId?: string
  receivedAt: Date
}

class EmailService {
  private imapConnections: Map<string, Imap> = new Map()

  async fetchEmails(account: EmailAccount, folder: string = 'inbox'): Promise<EmailData[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: account.email,
        password: account.password,
        host: account.imapServer,
        port: account.imapPort,
        tls: true,
        tlsOptions: {
          rejectUnauthorized: false
        },
        connTimeout: 15000,
        authTimeout: 10000
      })

      const emails: EmailData[] = []

      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end()
            return reject(err)
          }

          // 获取最近7天的未读邮件和最近1天的已读邮件
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
          console.log(`搜索从 ${sevenDaysAgo.toISOString()} 开始的未读邮件和从 ${oneDayAgo.toISOString()} 开始的已读邮件`);
          
          // 使用更高效的搜索条件：优先获取未读邮件
          const searchCriteria = [
            ['UNSEEN'], // 未读邮件（最近7天）
            ['SEEN', ['SINCE', sevenDaysAgo]] // 已读邮件（最近7天）
          ];
          
          // 先搜索未读邮件
          imap.search(['UNSEEN', ['SINCE', sevenDaysAgo]], (err, unseenResults) => {
            if (err) {
              imap.end()
              return reject(err)
            }

            // 再搜索已读邮件
            imap.search(['SEEN', ['SINCE', oneDayAgo]], (err, seenResults) => {
              if (err) {
                imap.end()
                return reject(err)
              }

              // 合并结果，去重
              const allResults = [...new Set([...unseenResults, ...seenResults])];
              
              if (allResults.length === 0) {
                console.log('没有找到符合条件的邮件');
                imap.end()
                return resolve([])
              }

              console.log(`找到 ${allResults.length} 封邮件 (未读: ${unseenResults.length}, 已读: ${seenResults.length})`);
              
              // 按UID排序，确保获取的是最新的邮件
              allResults.sort((a, b) => b - a);
              
              // 限制只处理最新的100封邮件以提升性能
              const limitedResults = allResults.slice(0, 100)
              console.log(`处理最新的 ${limitedResults.length} 封邮件`);
              
              const fetch = imap.fetch(limitedResults, { 
                bodies: '',
                struct: true,
                markSeen: false
              })

              let processedCount = 0
              const totalEmails = limitedResults.length

              fetch.on('message', (msg) => {
                let emailContent = ''
                let emailHeaders: any = {}

                msg.on('body', (stream) => {
                  stream.on('data', (chunk) => {
                    emailContent += chunk.toString('utf8')
                  })
                })

                msg.once('attributes', (attrs) => {
                  emailHeaders = attrs
                })

                msg.once('end', async () => {
                  try {
                    const parsed = await simpleParser(emailContent)
                    
                    const emailData: EmailData = {
                      subject: parsed.subject || '无主题',
                      from: parsed.from?.text || '',
                      to: parsed.to?.text || '',
                      cc: parsed.cc?.text,
                      bcc: parsed.bcc?.text,
                      body: parsed.text || '',
                      htmlBody: parsed.html,
                      messageId: parsed.messageId,
                      receivedAt: parsed.date || new Date()
                    }

                    emails.push(emailData)
                    processedCount++
                    
                    // 当所有邮件都处理完成时，立即结束
                    if (processedCount === totalEmails) {
                      imap.end()
                      resolve(emails)
                    }
                  } catch (error) {
                    console.error('解析邮件失败:', error)
                    processedCount++
                    
                    // 即使解析失败，也要继续处理其他邮件
                    if (processedCount === totalEmails) {
                      imap.end()
                      resolve(emails)
                    }
                  }
                })
              })

              fetch.once('error', (err) => {
                imap.end()
                reject(err)
              })

              fetch.once('end', () => {
                // 设置较短的超时时间，因为我们在邮件处理完成时会立即结束
                setTimeout(() => {
                  imap.end()
                  resolve(emails)
                }, 2000) // 2秒超时
              })
            })
          })
        })
      })

      imap.once('error', (err) => {
        reject(err)
      })

      imap.connect()
    })
  }

  async sendEmail(account: EmailAccount, to: string, subject: string, body: string, htmlBody?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        host: account.smtpServer,
        port: account.smtpPort,
        secure: account.smtpPort === 465,
        auth: {
          user: account.email,
          pass: account.password
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      const mailOptions = {
        from: account.email,
        to: to,
        subject: subject,
        text: body,
        html: htmlBody || body
      }

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('邮件发送失败:', error)
          reject(error)
        } else {
          console.log('邮件发送成功:', info.messageId)
          resolve(true)
        }
      })
    })
  }

  testConnection(account: EmailAccount): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: account.email,
        password: account.password,
        host: account.imapServer,
        port: account.imapPort,
        tls: true,
        tlsOptions: {
          rejectUnauthorized: false
        },
        connTimeout: 10000,
        authTimeout: 5000
      })

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err) => {
          imap.end()
          if (err) {
            resolve(false)
          } else {
            resolve(true)
          }
        })
      })

      imap.once('error', (err) => {
        resolve(false)
      })

      imap.connect()
    })
  }
}

export const emailService = new EmailService()