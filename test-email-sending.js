#!/usr/bin/env node

// 测试真实邮件发送功能

const API_BASE = 'http://localhost:3000/api';

async function testEmailSending() {
  console.log('🧪 开始测试真实邮件发送功能...\n');

  try {
    // 获取账号列表
    console.log('1. 获取邮件账号列表...');
    const accountsResponse = await fetch(`${API_BASE}/accounts`);
    const accounts = await accountsResponse.json();
    
    if (accounts.length === 0) {
      console.log('❌ 没有可用的邮件账号');
      return;
    }
    
    console.log(`✅ 找到 ${accounts.length} 个邮件账号`);
    
    // 使用Steven的账号发送测试邮件
    const stevenAccount = accounts.find(acc => acc.email === 'Steven@HH.email.cn');
    if (!stevenAccount) {
      console.log('❌ 未找到Steven的账号');
      return;
    }
    
    console.log(`\n2. 使用 ${stevenAccount.email} 发送测试邮件...`);
    
    const testEmail = {
      to: '18@HH.email.cn',  // 发送给另一个测试账号
      subject: '🎉 真实邮件发送测试',
      body: '这是一封通过真实SMTP服务器发送的测试邮件！\n\n发送时间: ' + new Date().toLocaleString(),
      htmlBody: '<h1>真实邮件发送测试</h1><p>这是一封通过真实SMTP服务器发送的测试邮件！</p><p>发送时间: ' + new Date().toLocaleString() + '</p>',
      accountId: stevenAccount.id
    };
    
    const sendResponse = await fetch(`${API_BASE}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmail)
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResponse.ok) {
      console.log('✅ 邮件发送成功！');
      console.log(`   主题: ${testEmail.subject}`);
      console.log(`   收件人: ${testEmail.to}`);
      console.log(`   发送时间: ${new Date().toLocaleString()}`);
      
      // 等待一下，然后检查收件箱
      console.log('\n3. 检查收件人邮箱...');
      
      // 获取收件人账号ID
      const recipientAccount = accounts.find(acc => acc.email === '18@HH.email.cn');
      if (recipientAccount) {
        // 刷新收件人邮件
        await fetch(`${API_BASE}/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId: recipientAccount.id })
        });
        
        // 等待邮件处理
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 获取收件人邮件列表
        const emailsResponse = await fetch(`${API_BASE}/emails?accountId=${recipientAccount.id}&folder=inbox`);
        const emails = await emailsResponse.json();
        
        // 查找刚刚发送的邮件
        const sentEmail = emails.find(email => 
          email.subject.includes('真实邮件发送测试') && 
          email.from === 'Steven@HH.email.cn'
        );
        
        if (sentEmail) {
          console.log('✅ 在收件箱中找到发送的邮件！');
          console.log(`   主题: ${sentEmail.subject}`);
          console.log(`   发件人: ${sentEmail.from}`);
          console.log(`   收件人: ${sentEmail.to}`);
          console.log(`   接收时间: ${sentEmail.receivedAt}`);
          console.log(`   内容: ${sentEmail.body.substring(0, 100)}...`);
        } else {
          console.log('⚠️  未在收件箱中找到发送的邮件（可能需要更长时间同步）');
        }
      } else {
        console.log('❌ 未找到收件人账号');
      }
    } else {
      console.log('❌ 邮件发送失败:', sendResult.error);
      if (sendResult.details) {
        console.log('   详细信息:', sendResult.details);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
  
  console.log('\n🎉 邮件发送测试完成！');
}

// 运行测试
testEmailSending().catch(console.error);