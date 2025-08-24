const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query'],
});

async function cleanupDuplicates() {
  try {
    console.log('=== 开始清理重复邮件 ===\n');
    
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
    
    console.log(`发现 ${duplicateMessages.length} 组重复邮件`);
    
    let totalDeleted = 0;
    
    for (const dup of duplicateMessages) {
      console.log(`\n--- 处理重复组: ${dup.messageId} ---`);
      
      // 获取该messageId的所有邮件，按创建时间降序排列
      const emails = await prisma.email.findMany({
        where: {
          messageId: dup.messageId,
          accountId: dup.accountId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`找到 ${emails.length} 封重复邮件`);
      
      // 保留最新的一封，删除其他的
      if (emails.length > 1) {
        const keepEmail = emails[0]; // 保留最新创建的
        const deleteEmails = emails.slice(1); // 删除其余的
        
        console.log(`保留邮件 ID: ${keepEmail.id} (创建时间: ${keepEmail.createdAt})`);
        
        // 删除重复的邮件
        for (const email of deleteEmails) {
          await prisma.email.delete({
            where: {
              id: email.id
            }
          });
          console.log(`删除重复邮件 ID: ${email.id} (创建时间: ${email.createdAt})`);
          totalDeleted++;
        }
      }
    }
    
    // 处理没有messageId的重复邮件
    console.log('\n=== 处理无messageId的重复邮件 ===');
    
    const emailsWithoutMessageId = await prisma.email.findMany({
      where: {
        messageId: null
      },
      select: {
        id: true,
        subject: true,
        from: true,
        receivedAt: true,
        accountId: true,
        createdAt: true
      }
    });
    
    // 按主题+发件人分组
    const emailGroups = {};
    for (const email of emailsWithoutMessageId) {
      const key = `${email.subject}|${email.from}|${email.accountId}`;
      if (!emailGroups[key]) {
        emailGroups[key] = [];
      }
      emailGroups[key].push(email);
    }
    
    const potentialDuplicates = Object.entries(emailGroups).filter(([key, emails]) => emails.length > 1);
    
    console.log(`发现 ${potentialDuplicates.length} 组无messageId的重复邮件`);
    
    for (const [key, emails] of potentialDuplicates) {
      console.log(`\n--- 处理无messageId重复组: ${key} ---`);
      console.log(`找到 ${emails.length} 封重复邮件`);
      
      // 按创建时间排序
      emails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // 保留最新的一封，删除其他的
      const keepEmail = emails[0];
      const deleteEmails = emails.slice(1);
      
      console.log(`保留邮件 ID: ${keepEmail.id} (创建时间: ${keepEmail.createdAt})`);
      
      for (const email of deleteEmails) {
        await prisma.email.delete({
          where: {
            id: email.id
          }
        });
        console.log(`删除重复邮件 ID: ${email.id} (创建时间: ${email.createdAt})`);
        totalDeleted++;
      }
    }
    
    console.log(`\n=== 清理完成 ===`);
    console.log(`总共删除了 ${totalDeleted} 封重复邮件`);
    
    // 验证清理结果
    console.log('\n=== 验证清理结果 ===');
    
    const remainingDuplicates = await prisma.email.groupBy({
      by: ['messageId', 'accountId'],
      having: {
        messageId: {
          _count: {
            gt: 1
          }
        }
      }
    });
    
    console.log(`剩余重复组: ${remainingDuplicates.length}`);
    
    // 显示各账号的邮件数量
    console.log('\n=== 各账号邮件统计 ===');
    const accounts = await prisma.emailAccount.findMany();
    
    for (const account of accounts) {
      const emailCount = await prisma.email.count({
        where: {
          accountId: account.id
        }
      });
      console.log(`${account.email}: ${emailCount} 封邮件`);
    }
    
  } catch (error) {
    console.error('清理失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();