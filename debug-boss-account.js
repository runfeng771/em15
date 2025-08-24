const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

async function debugBossAccount() {
  try {
    console.log('=== 调试 BOSS@HH.email.cn 账号 ===\n');
    
    // 模拟账号信息
    const account = {
      email: 'BOSS@HH.email.cn',
      password: 'EwGEZHiEjuqsdQj9', // 从数据库获取的实际密码
      imapServer: 'imap.email.cn',
      imapPort: 993
    };
    
    console.log(`正在连接 ${account.email}...`);
    
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
    });

    imap.once('ready', () => {
      console.log('✅ IMAP连接成功');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ 打开收件箱失败:', err.message);
          imap.end();
          return;
        }
        
        console.log(`✅ 收件箱打开成功`);
        console.log(`📊 邮件总数: ${box.messages.total}`);
        console.log(`📊 未读邮件: ${box.messages.unseen}`);
        
        // 搜索所有邮件
        imap.search(['ALL'], (err, results) => {
          if (err) {
            console.error('❌ 搜索邮件失败:', err.message);
            imap.end();
            return;
          }
          
          console.log(`🔍 搜索到 ${results.length} 封邮件`);
          
          if (results.length === 0) {
            console.log('📭 没有找到任何邮件');
            imap.end();
            return;
          }
          
          // 按UID排序
          results.sort((a, b) => b - a);
          
          // 只处理最新的3封邮件进行测试
          const testResults = results.slice(0, 3);
          console.log(`📋 将处理最新的 ${testResults.length} 封邮件`);
          
          const fetch = imap.fetch(testResults, {
            bodies: '',
            struct: true,
            markSeen: false
          });
          
          let emailCount = 0;
          
          fetch.on('message', (msg) => {
            emailCount++;
            console.log(`\n--- 处理第 ${emailCount} 封邮件 ---`);
            
            let emailContent = '';
            let emailHeaders = {};
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                emailContent += chunk.toString('utf8');
              });
            });
            
            msg.once('attributes', (attrs) => {
              emailHeaders = attrs;
              console.log(`📧 邮件UID: ${attrs.uid}`);
              console.log(`📅 邮件日期: ${attrs.date}`);
            });
            
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(emailContent);
                
                console.log(`📝 主题: ${parsed.subject || '无主题'}`);
                console.log(`👤 发件人: ${parsed.from?.text || '未知'}`);
                console.log(`📬 收件人: ${parsed.to?.text || '未知'}`);
                console.log(`🆔 Message-ID: ${parsed.messageId || '无'}`);
                console.log(`⏰ 接收时间: ${parsed.date || '未知'}`);
                
              } catch (error) {
                console.error('❌ 解析邮件失败:', error.message);
              }
            });
          });
          
          fetch.once('error', (err) => {
            console.error('❌ 获取邮件失败:', err.message);
            imap.end();
          });
          
          fetch.once('end', () => {
            console.log(`\n✅ 成功处理了 ${emailCount} 封邮件`);
            imap.end();
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error('❌ IMAP连接失败:', err.message);
    });

    imap.connect();
    
  } catch (error) {
    console.error('调试失败:', error);
  }
}

debugBossAccount();