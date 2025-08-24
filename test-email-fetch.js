const { PrismaClient } = require('@prisma/client');
const Imap = require('imap');

const prisma = new PrismaClient({
  log: ['query'],
});

async function testEmailFetch() {
  try {
    console.log('=== 测试邮件账号连接和获取 ===\n');
    
    const accounts = await prisma.emailAccount.findMany();
    
    for (const account of accounts) {
      console.log(`--- 测试账号: ${account.email} ---`);
      console.log(`IMAP: ${account.imapServer}:${account.imapPort}`);
      
      // 测试连接
      const isConnected = await testImapConnection(account);
      console.log(`连接状态: ${isConnected ? '✓ 成功' : '✗ 失败'}`);
      
      if (isConnected) {
        // 尝试获取邮件数量
        const emailCount = await getEmailCount(account);
        console.log(`服务器邮件数量: ${emailCount}`);
        
        // 获取数据库中的邮件数量
        const dbEmailCount = await prisma.email.count({
          where: {
            accountId: account.id
          }
        });
        console.log(`数据库邮件数量: ${dbEmailCount}`);
        
        // 检查是否有差异
        if (emailCount > dbEmailCount) {
          console.log(`⚠️  警告: 服务器上有 ${emailCount - dbEmailCount} 封邮件未同步`);
        } else if (emailCount < dbEmailCount) {
          console.log(`ℹ️  信息: 数据库中有 ${dbEmailCount - emailCount} 封邮件可能已从服务器删除`);
        } else {
          console.log(`✓ 邮件数量一致`);
        }
      }
      
      console.log('---\n');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testImapConnection(account) {
  return new Promise((resolve) => {
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
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        imap.end();
        if (err) {
          console.log(`连接错误: ${err.message}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    imap.once('error', (err) => {
      console.log(`IMAP错误: ${err.message}`);
      resolve(false);
    });

    imap.connect();
  });
}

async function getEmailCount(account) {
  return new Promise((resolve) => {
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
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        imap.end();
        if (err) {
          resolve(0);
        } else {
          resolve(box.messages.total || 0);
        }
      });
    });

    imap.once('error', (err) => {
      resolve(0);
    });

    imap.connect();
  });
}

testEmailFetch();