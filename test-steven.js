#!/usr/bin/env node

// 测试脚本 - 专门测试Steven@HH.email.cn的邮件获取

const API_BASE = 'http://localhost:3000/api';

async function testStevenEmail() {
  console.log('🧪 开始测试Steven@HH.email.cn邮件获取...\n');

  try {
    // 1. 获取所有账号
    console.log('1. 获取邮件账号列表...');
    const accountsResponse = await fetch(`${API_BASE}/accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`✅ 成功获取 ${accounts.length} 个邮件账号`);
    
    // 找到Steven账号
    const stevenAccount = accounts.find(acc => acc.email === 'Steven@HH.email.cn');
    
    if (!stevenAccount) {
      console.log('❌ 未找到Steven@HH.email.cn账号');
      return;
    }
    
    console.log(`✅ 找到Steven账号，ID: ${stevenAccount.id}`);
    console.log(`   邮箱: ${stevenAccount.email}`);
    console.log(`   IMAP服务器: ${stevenAccount.imapServer}:${stevenAccount.imapPort}`);
    console.log(`   SMTP服务器: ${stevenAccount.smtpServer}:${stevenAccount.smtpPort}`);

    // 2. 测试连接邮件服务器
    console.log('\n2. 测试连接邮件服务器...');
    const refreshResponse = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: stevenAccount.id })
    });
    
    const refreshData = await refreshResponse.json();
    
    if (refreshResponse.ok) {
      console.log('✅ 成功连接到邮件服务器');
      console.log(`   获取到 ${refreshData.count || 0} 封新邮件`);
      
      if (refreshData.emails && refreshData.emails.length > 0) {
        console.log('\n3. 邮件内容详情:');
        refreshData.emails.forEach((email, index) => {
          console.log(`\n--- 邮件 ${index + 1} ---`);
          console.log(`主题: ${email.subject}`);
          console.log(`发件人: ${email.from}`);
          console.log(`收件人: ${email.to}`);
          console.log(`时间: ${new Date(email.receivedAt).toLocaleString()}`);
          console.log(`内容: ${email.body.substring(0, 100)}...`);
          console.log(`是否已读: ${email.isRead ? '是' : '否'}`);
          console.log(`是否星标: ${email.isStarred ? '是' : '否'}`);
        });
      }
    } else {
      console.log('❌ 连接邮件服务器失败');
      console.log(`错误: ${refreshData.error}`);
      if (refreshData.details) {
        console.log(`详情: ${refreshData.details}`);
      }
    }

    // 3. 获取该账号的所有邮件
    console.log('\n4. 获取Steven账号的所有邮件...');
    const emailsResponse = await fetch(`${API_BASE}/emails?accountId=${stevenAccount.id}&folder=inbox`);
    const emails = await emailsResponse.json();
    
    if (Array.isArray(emails)) {
      console.log(`✅ 成功获取 ${emails.length} 封邮件`);
      
      if (emails.length > 0) {
        console.log('\n5. 邮件列表:');
        emails.forEach((email, index) => {
          console.log(`\n${index + 1}. ${email.subject}`);
          console.log(`   发件人: ${email.from}`);
          console.log(`   时间: ${new Date(email.receivedAt).toLocaleString()}`);
          console.log(`   状态: ${email.isRead ? '已读' : '未读'} ${email.isStarred ? '⭐' : ''}`);
        });
      }
    } else {
      console.log('❌ 获取邮件列表失败');
    }

  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
  }

  console.log('\n🎉 Steven邮件测试完成！');
}

// 运行测试
testStevenEmail().catch(console.error);