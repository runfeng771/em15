const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query'],
});

async function debugAccounts() {
  try {
    // 获取所有邮件账号
    const accounts = await prisma.emailAccount.findMany();
    
    console.log('=== 邮件账号配置 ===');
    console.log(`总共找到 ${accounts.length} 个邮件账号\n`);
    
    for (const account of accounts) {
      console.log(`账号: ${account.email}`);
      console.log(`IMAP服务器: ${account.imapServer}:${account.imapPort}`);
      console.log(`SMTP服务器: ${account.smtpServer}:${account.smtpPort}`);
      console.log(`状态: ${account.isActive ? '活跃' : '禁用'}`);
      console.log(`创建时间: ${account.createdAt}`);
      console.log('---');
    }
    
    // 检查每个账号的邮件数量
    console.log('\n=== 各账号邮件统计 ===');
    for (const account of accounts) {
      const emailCount = await prisma.email.count({
        where: {
          accountId: account.id
        }
      });
      
      console.log(`${account.email}: ${emailCount} 封邮件`);
    }
    
    // 检查重复邮件
    console.log('\n=== 重复邮件检查 ===');
    const duplicateMessages = await prisma.email.groupBy({
      by: ['messageId'],
      having: {
        messageId: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        messageId: true
      }
    });
    
    console.log(`发现 ${duplicateMessages.length} 个重复的messageId`);
    for (const dup of duplicateMessages) {
      console.log(`MessageId: ${dup.messageId}, 重复次数: ${dup._count.messageId}`);
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAccounts();