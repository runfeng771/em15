const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query'],
});

// 邮件获取函数
async function fetchAllEmails(account) {
  return new Promise((resolve, reject) => {
    const Imap = require('imap');
    
    const imap = new Imap({
      user: account.email,
      password: account.password,
      host: account.imapServer,
      port: account.imapPort,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false
      }
    });

    const emails = [];

    imap.once('ready', () => {
      imap.openBox('inbox', false, (err) => {
        if (err) {
          imap.end()
          return reject(err)
        }

        // 获取所有邮件
        imap.search(['ALL'], (err, results) => {
          if (err) {
            imap.end()
            return reject(err)
          }

          if (results.length === 0) {
            console.log('没有找到任何邮件');
            imap.end()
            return resolve([])
          }

          console.log(`找到 ${results.length} 封邮件`);
          
          // 按UID排序，确保获取的是最新的邮件
          results.sort((a, b) => b - a);
          
          // 限制处理最新的500封邮件
          const limitedResults = results.slice(0, 500)
          console.log(`处理最新的 ${limitedResults.length} 封邮件`);
          
          const fetch = imap.fetch(limitedResults, { 
            bodies: '',
            struct: true,
            markSeen: false
          })

          fetch.on('message', (msg) => {
            let emailContent = ''
            let emailHeaders = {}

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
                const simpleParser = require('mailparser').simpleParser;
                const parsed = await simpleParser(emailContent)
                
                const emailData = {
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
              } catch (error) {
                console.error('解析邮件失败:', error)
              }
            })
          })

          fetch.once('error', (err) => {
            imap.end()
            reject(err)
          })

          fetch.once('end', () => {
            imap.end()
            resolve(emails)
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

async function fixMissingEmails() {
  try {
    console.log('=== 修复缺少邮件的账号 ===\n');
    
    // 获取需要修复的账号
    const accountsToFix = [
      '99@HH.email.cn',    // 缺少6封邮件
      'Steven@HH.email.cn' // 缺少36封邮件
    ];
    
    for (const email of accountsToFix) {
      console.log(`--- 处理账号: ${email} ---`);
      
      // 获取账号信息
      const account = await prisma.emailAccount.findUnique({
        where: { email }
      });
      
      if (!account) {
        console.log(`❌ 账号不存在: ${email}`);
        continue;
      }
      
      console.log(`账号ID: ${account.id}`);
      
      // 获取当前数据库邮件数量
      const beforeCount = await prisma.email.count({
        where: { accountId: account.id }
      });
      console.log(`修复前邮件数量: ${beforeCount}`);
      
      // 模拟调用fetch-all API来重新获取所有邮件
      console.log('开始重新获取所有邮件...');
      
      // 这里我们直接调用fetch-all的逻辑
      // 由于模块导入问题，我们直接实现邮件获取逻辑
      const Imap = require('imap');
      const simpleParser = require('mailparser').simpleParser;
      
      try {
        // 从IMAP服务器获取所有邮件
        const fetchedEmails = await fetchAllEmails(account);
        
        console.log(`从服务器获取到 ${fetchedEmails.length} 封邮件`);
        
        if (fetchedEmails.length === 0) {
          console.log('没有找到邮件');
          continue;
        }
        
        // 清空该账号的所有收件箱邮件
        const deletedCount = await prisma.email.deleteMany({
          where: {
            accountId: account.id,
            folder: 'inbox'
          }
        });
        
        console.log(`清空了 ${deletedCount.count} 封现有邮件`);
        
        // 保存所有邮件
        const savedEmails = await Promise.all(
          fetchedEmails.map(email => 
            prisma.email.create({
              data: {
                subject: email.subject,
                from: email.from,
                to: email.to,
                cc: email.cc,
                bcc: email.bcc,
                body: email.body,
                htmlBody: email.htmlBody || null,
                folder: 'inbox',
                isRead: false,
                isStarred: false,
                receivedAt: email.receivedAt,
                accountId: account.id,
                messageId: email.messageId
              }
            })
          )
        );
        
        const afterCount = await prisma.email.count({
          where: { accountId: account.id }
        });
        
        console.log(`✅ 修复完成！`);
        console.log(`保存了 ${savedEmails.length} 封邮件`);
        console.log(`修复后邮件数量: ${afterCount}`);
        console.log(`净增邮件数量: ${afterCount - beforeCount}`);
        
      } catch (error) {
        console.error(`❌ 处理账号 ${email} 时出错:`, error.message);
      }
      
      console.log('---\n');
    }
    
    console.log('=== 修复完成 ===');
    
    // 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    const accounts = await prisma.emailAccount.findMany();
    
    for (const account of accounts) {
      const emailCount = await prisma.email.count({
        where: { accountId: account.id }
      });
      console.log(`${account.email}: ${emailCount} 封邮件`);
    }
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingEmails();