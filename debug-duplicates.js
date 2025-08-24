const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query'],
});

async function debugDuplicates() {
  try {
    console.log('=== 详细重复邮件分析 ===\n');
    
    // 获取所有重复的messageId
    const duplicateMessages = await prisma.email.groupBy({
      by: ['messageId', 'accountId'],
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
    
    console.log(`发现 ${duplicateMessages.length} 组重复邮件\n`);
    
    for (const dup of duplicateMessages) {
      console.log(`--- 重复组 ${dup.messageId} ---`);
      console.log(`重复次数: ${dup._count.messageId}`);
      console.log(`账号ID: ${dup.accountId}`);
      
      // 获取该messageId的所有邮件
      const emails = await prisma.email.findMany({
        where: {
          messageId: dup.messageId,
          accountId: dup.accountId
        },
        orderBy: {
          receivedAt: 'desc'
        }
      });
      
      console.log('邮件详情:');
      emails.forEach((email, index) => {
        console.log(`  ${index + 1}. ID: ${email.id}`);
        console.log(`     主题: ${email.subject}`);
        console.log(`     发件人: ${email.from}`);
        console.log(`     收件时间: ${email.receivedAt}`);
        console.log(`     创建时间: ${email.createdAt}`);
        console.log('');
      });
    }
    
    // 分析没有messageId的邮件
    console.log('\n=== 无messageId邮件分析 ===');
    const emailsWithoutMessageId = await prisma.email.findMany({
      where: {
        messageId: null
      },
      select: {
        id: true,
        subject: true,
        from: true,
        receivedAt: true,
        accountId: true
      }
    });
    
    console.log(`发现 ${emailsWithoutMessageId.length} 封没有messageId的邮件`);
    
    // 按主题+发件人分组，检查可能的重复
    const emailGroups = {};
    for (const email of emailsWithoutMessageId) {
      const key = `${email.subject}|${email.from}`;
      if (!emailGroups[key]) {
        emailGroups[key] = [];
      }
      emailGroups[key].push(email);
    }
    
    const potentialDuplicates = Object.entries(emailGroups).filter(([key, emails]) => emails.length > 1);
    
    console.log(`发现 ${potentialDuplicates.length} 组可能的无messageId重复邮件\n`);
    
    for (const [key, emails] of potentialDuplicates) {
      console.log(`--- 可能重复组: ${key} ---`);
      emails.forEach((email, index) => {
        console.log(`  ${index + 1}. ID: ${email.id}`);
        console.log(`     收件时间: ${email.receivedAt}`);
        console.log(`     账号ID: ${email.accountId}`);
      });
      console.log('');
    }
    
    // 检查邮件账号配置
    console.log('\n=== 邮件账号配置验证 ===');
    const accounts = await prisma.emailAccount.findMany();
    
    for (const account of accounts) {
      console.log(`账号: ${account.email}`);
      console.log(`IMAP: ${account.imapServer}:${account.imapPort}`);
      console.log(`SMTP: ${account.smtpServer}:${account.smtpPort}`);
      
      // 检查服务器配置是否正确
      const expectedImap = 'imap.email.cn';
      const expectedSmtp = 'smtp.email.cn';
      const expectedImapPort = 993;
      const expectedSmtpPort = 465;
      
      const imapCorrect = account.imapServer === expectedImap && account.imapPort === expectedImapPort;
      const smtpCorrect = account.smtpServer === expectedSmtp && account.smtpPort === expectedSmtpPort;
      
      console.log(`IMAP配置: ${imapCorrect ? '✓ 正确' : '✗ 错误'}`);
      console.log(`SMTP配置: ${smtpCorrect ? '✓ 正确' : '✗ 错误'}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDuplicates();