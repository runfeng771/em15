const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query'],
});

async function getBossPassword() {
  try {
    const account = await prisma.emailAccount.findUnique({
      where: { email: 'BOSS@HH.email.cn' }
    });
    
    if (account) {
      console.log(`账号: ${account.email}`);
      console.log(`密码: ${account.password}`);
      console.log(`IMAP: ${account.imapServer}:${account.imapPort}`);
    } else {
      console.log('未找到BOSS@HH.email.cn账号');
    }
    
  } catch (error) {
    console.error('获取密码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getBossPassword();