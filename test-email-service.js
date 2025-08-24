const { PrismaClient } = require('@prisma/client');
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

const prisma = new PrismaClient({
  log: ['query'],
});

// 复制email-service的逻辑
class EmailService {
  async fetchEmails(account, folder = 'inbox') {
    return new Promise((resolve, reject) => {
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
      let messagesProcessed = 0;
      let totalMessages = 0;

      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end()
            return reject(err)
          }

          // 获取所有邮件
          const searchCriteria = ['ALL'];
          imap.search(searchCriteria, (err, results) => {
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
            
            // 按UID排序，确保获取的是最新的邮件（UID越大，邮件越新）
            results.sort((a, b) => b - a);
            
            // 限制只处理最新的500封邮件
            const limitedResults = results.slice(0, 500)
            console.log(`处理最新的 ${limitedResults.length} 封邮件`);
            totalMessages = limitedResults.length;
            
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
                  console.log(`开始解析邮件，内容长度: ${emailContent.length}`);
                  const parsed = await simpleParser(emailContent)
                  
                  console.log(`邮件解析成功: ${parsed.subject || '无主题'}`);
                  
                  const emailData = {
                    subject: parsed.subject || '无主题',
                    from: parsed.from ? parsed.from.text : '',
                    to: parsed.to ? parsed.to.text : '',
                    cc: parsed.cc ? parsed.cc.text : undefined,
                    bcc: parsed.bcc ? parsed.bcc.text : undefined,
                    body: parsed.text || '',
                    htmlBody: parsed.html,
                    messageId: parsed.messageId,
                    receivedAt: parsed.date || new Date()
                  }

                  emails.push(emailData);
                  messagesProcessed++;
                  console.log(`邮件已添加到列表，当前总数: ${emails.length}`);
                  
                  // 如果所有邮件都处理完了，resolve
                  if (messagesProcessed === totalMessages) {
                    console.log(`所有邮件处理完成，总共 ${emails.length} 封`);
                    resolve(emails);
                  }
                } catch (error) {
                  console.error('解析邮件失败:', error);
                  console.error('错误详情:', error.message);
                  console.error('邮件内容前200字符:', emailContent.substring(0, 200));
                  messagesProcessed++;
                  
                  // 即使解析失败，也要继续处理其他邮件
                  if (messagesProcessed === totalMessages) {
                    console.log(`所有邮件处理完成，总共 ${emails.length} 封`);
                    resolve(emails);
                  }
                }
              })
            })

            fetch.once('error', (err) => {
              imap.end()
              reject(err)
            })

            fetch.once('end', () => {
              console.log('Fetch结束，等待邮件解析完成...');
              // 不在这里立即resolve，等待所有邮件解析完成
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
}

async function testEmailService() {
  try {
    console.log('=== 测试 Email Service ===\n');
    
    // 获取BOSS账号信息
    const account = await prisma.emailAccount.findUnique({
      where: { email: 'BOSS@HH.email.cn' }
    });
    
    if (!account) {
      console.log('未找到BOSS@HH.email.cn账号');
      return;
    }
    
    console.log(`账号: ${account.email}`);
    console.log(`IMAP: ${account.imapServer}:${account.imapPort}`);
    
    // 使用email-service
    const emailService = new EmailService();
    
    console.log('\n开始获取邮件...');
    const emails = await emailService.fetchEmails(account, 'inbox');
    
    console.log(`\n获取结果:`);
    console.log(`邮件数量: ${emails.length}`);
    
    if (emails.length > 0) {
      console.log('\n邮件列表:');
      emails.forEach((email, index) => {
        console.log(`\n--- 邮件 ${index + 1} ---`);
        console.log(`主题: ${email.subject}`);
        console.log(`发件人: ${email.from}`);
        console.log(`收件人: ${email.to}`);
        console.log(`接收时间: ${email.receivedAt}`);
        console.log(`Message-ID: ${email.messageId || '无'}`);
      });
    } else {
      console.log('没有获取到任何邮件');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailService();