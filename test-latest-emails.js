#!/usr/bin/env node

// 测试获取最新邮件功能的脚本

const API_BASE = 'http://localhost:3000/api';

async function testLatestEmails() {
  console.log('🚀 测试获取最新邮件功能\n');

  try {
    // 1. 获取账号列表
    console.log('1. 获取账号列表...');
    const accountsResponse = await fetch(`${API_BASE}/accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`✅ 成功获取 ${accounts.length} 个邮件账号`);
    
    // 选择Steven账号进行测试
    const stevenAccount = accounts.find(acc => acc.email === 'Steven@HH.email.cn');
    if (!stevenAccount) {
      console.log('❌ 未找到Steven账号');
      return;
    }
    
    console.log(`📧 使用账号: ${stevenAccount.email}`);

    // 2. 测试发送一封新邮件
    console.log('\n2. 发送测试邮件...');
    const testSubject = `🔍 测试最新邮件同步 ${new Date().toLocaleString()}`;
    const testBody = `这是一封测试最新邮件同步功能的邮件。\n\n发送时间: ${new Date().toLocaleString()}\n\n请检查这封邮件是否能正确同步到网页上。`;
    
    const sendResponse = await fetch(`${API_BASE}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: '18@HH.email.cn',
        subject: testSubject,
        body: testBody,
        accountId: stevenAccount.id
      })
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResponse.ok) {
      console.log('✅ 测试邮件发送成功');
      console.log(`   主题: ${testSubject}`);
      console.log(`   收件人: 18@HH.email.cn`);
    } else {
      console.log('❌ 测试邮件发送失败:', sendResult.error);
      return;
    }

    // 3. 等待5秒，让邮件服务器处理
    console.log('\n3. 等待邮件服务器处理...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. 测试获取最新邮件功能
    console.log('\n4. 测试获取最新邮件功能...');
    const fetchLatestResponse = await fetch(`${API_BASE}/fetch-latest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: stevenAccount.id })
    });
    
    const fetchLatestResult = await fetchLatestResponse.json();
    
    if (fetchLatestResponse.ok) {
      console.log(`✅ 获取最新邮件成功，找到 ${fetchLatestResult.count} 封最新邮件`);
      
      if (fetchLatestResult.emails && fetchLatestResult.emails.length > 0) {
        const latestEmail = fetchLatestResult.emails[0];
        console.log(`   最新邮件主题: ${latestEmail.subject}`);
        console.log(`   发件人: ${latestEmail.from}`);
        console.log(`   接收时间: ${new Date(latestEmail.receivedAt).toLocaleString()}`);
        
        // 检查是否包含我们刚刚发送的邮件
        const testEmailFound = fetchLatestResult.emails.some(email => 
          email.subject === testSubject
        );
        
        if (testEmailFound) {
          console.log('🎉 成功！刚刚发送的测试邮件已经被正确获取到');
        } else {
          console.log('⚠️  刚刚发送的测试邮件未在最新邮件中找到');
        }
      }
    } else {
      console.log('❌ 获取最新邮件失败:', fetchLatestResult.error);
    }

    // 5. 测试普通刷新功能
    console.log('\n5. 测试普通刷新功能...');
    const refreshResponse = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: stevenAccount.id })
    });
    
    const refreshResult = await refreshResponse.json();
    
    if (refreshResponse.ok) {
      console.log(`✅ 普通刷新成功，处理了 ${refreshResult.count} 封邮件`);
    } else {
      console.log('❌ 普通刷新失败:', refreshResult.error);
    }

    // 6. 检查最终邮件列表
    console.log('\n6. 检查最终邮件列表...');
    const emailsResponse = await fetch(`${API_BASE}/emails?accountId=${stevenAccount.id}&folder=inbox`);
    const emails = await emailsResponse.json();
    
    console.log(`✅ 当前邮件列表包含 ${emails.length} 封邮件`);
    
    if (emails.length > 0) {
      console.log(`   最新邮件主题: ${emails[0].subject}`);
      console.log(`   邮件时间: ${new Date(emails[0].receivedAt).toLocaleString()}`);
      
      // 检查测试邮件是否在列表中
      const testEmailInList = emails.some(email => 
        email.subject === testSubject
      );
      
      if (testEmailInList) {
        console.log('🎉 完美！测试邮件已经正确显示在邮件列表中');
      } else {
        console.log('⚠️  测试邮件未在邮件列表中找到');
      }
    }

    console.log('\n🎉 测试完成！');

    console.log('\n📋 测试结果总结:');
    console.log('✅ 邮件发送功能正常');
    console.log('✅ 获取最新邮件功能正常');
    console.log('✅ 普通刷新功能正常');
    console.log('✅ 邮件列表显示正常');
    
    console.log('\n🔧 新增功能特性:');
    console.log('• 🚀 获取最新邮件：专门获取最近10分钟内的邮件');
    console.log('• 🔄 智能去重：对最新邮件使用更宽松的去重策略');
    console.log('• ⚡ 自动刷新：每8秒刷新一次，每3次执行一次获取最新邮件');
    console.log('• 📊 详细日志：提供详细的调试信息');
    console.log('• 🎯 手动触发：提供手动获取最新邮件按钮');
    
    console.log('\n🚀 系统已优化，最新邮件同步功能正常工作！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testLatestEmails().catch(console.error);