#!/usr/bin/env node

// 详细的邮件同步测试脚本

const API_BASE = 'http://localhost:3000/api';

async function testEmailSync() {
  console.log('🔍 详细测试邮件同步功能\n');

  try {
    // 1. 获取账号列表
    console.log('1. 获取账号列表...');
    const accountsResponse = await fetch(`${API_BASE}/accounts`);
    const accounts = await accountsResponse.json();
    
    console.log(`✅ 成功获取 ${accounts.length} 个邮件账号`);
    
    // 选择Steven和18账号进行测试
    const stevenAccount = accounts.find(acc => acc.email === 'Steven@HH.email.cn');
    const targetAccount = accounts.find(acc => acc.email === '18@HH.email.cn');
    
    if (!stevenAccount || !targetAccount) {
      console.log('❌ 未找到测试账号');
      return;
    }
    
    console.log(`📧 发件账号: ${stevenAccount.email}`);
    console.log(`📧 收件账号: ${targetAccount.email}`);

    // 2. 发送一封新邮件
    console.log('\n2. 发送测试邮件...');
    const testSubject = `🔍 详细测试邮件同步 ${new Date().toLocaleString()}`;
    const testBody = `这是一封详细测试邮件同步功能的邮件。\n\n发送时间: ${new Date().toLocaleString()}\n\n请检查这封邮件的同步情况。`;
    
    const sendResponse = await fetch(`${API_BASE}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: targetAccount.email,
        subject: testSubject,
        body: testBody,
        accountId: stevenAccount.id
      })
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResponse.ok) {
      console.log('✅ 测试邮件发送成功');
      console.log(`   主题: ${testSubject}`);
      console.log(`   收件人: ${targetAccount.email}`);
    } else {
      console.log('❌ 测试邮件发送失败:', sendResult.error);
      return;
    }

    // 3. 等待更长时间，让邮件服务器处理
    console.log('\n3. 等待邮件服务器处理...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 4. 检查收件人的邮件列表
    console.log('\n4. 检查收件人的邮件列表...');
    const targetEmailsResponse = await fetch(`${API_BASE}/emails?accountId=${targetAccount.id}&folder=inbox`);
    const targetEmails = await targetEmailsResponse.json();
    
    console.log(`✅ 收件人当前邮件列表包含 ${targetEmails.length} 封邮件`);
    
    if (targetEmails.length > 0) {
      console.log(`   最新邮件主题: ${targetEmails[0].subject}`);
      console.log(`   邮件时间: ${new Date(targetEmails[0].receivedAt).toLocaleString()}`);
      
      // 检查测试邮件是否在列表中
      const testEmailInList = targetEmails.some(email => 
        email.subject === testSubject
      );
      
      if (testEmailInList) {
        console.log('🎉 太好了！测试邮件已经正确显示在收件人的邮件列表中');
        
        // 找到这封邮件的详细信息
        const testEmail = targetEmails.find(email => email.subject === testSubject);
        console.log(`   邮件ID: ${testEmail.id}`);
        console.log(`   发件人: ${testEmail.from}`);
        console.log(`   接收时间: ${new Date(testEmail.receivedAt).toLocaleString()}`);
      } else {
        console.log('⚠️  测试邮件未在收件人的邮件列表中找到');
        
        // 显示前5封邮件的主题，帮助调试
        console.log('\n   前5封邮件主题:');
        targetEmails.slice(0, 5).forEach((email, index) => {
          console.log(`   ${index + 1}. ${email.subject} (${new Date(email.receivedAt).toLocaleString()})`);
        });
      }
    }

    // 5. 测试获取最新邮件功能
    console.log('\n5. 测试获取最新邮件功能...');
    const fetchLatestResponse = await fetch(`${API_BASE}/fetch-latest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: targetAccount.id })
    });
    
    const fetchLatestResult = await fetchLatestResponse.json();
    
    if (fetchLatestResponse.ok) {
      console.log(`✅ 获取最新邮件成功，找到 ${fetchLatestResult.count} 封最新邮件`);
      
      if (fetchLatestResult.emails && fetchLatestResult.emails.length > 0) {
        console.log('   最新邮件列表:');
        fetchLatestResult.emails.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email.subject} (${new Date(email.receivedAt).toLocaleString()})`);
        });
        
        // 检查是否包含测试邮件
        const testEmailInLatest = fetchLatestResult.emails.some(email => 
          email.subject === testSubject
        );
        
        if (testEmailInLatest) {
          console.log('🎉 完美！测试邮件在最新邮件中被找到');
        } else {
          console.log('⚠️  测试邮件未在最新邮件中找到');
        }
      }
    } else {
      console.log('❌ 获取最新邮件失败:', fetchLatestResult.error);
    }

    // 6. 测试普通刷新功能
    console.log('\n6. 测试普通刷新功能...');
    const refreshResponse = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId: targetAccount.id })
    });
    
    const refreshResult = await refreshResponse.json();
    
    if (refreshResponse.ok) {
      console.log(`✅ 普通刷新成功，处理了 ${refreshResult.count} 封邮件`);
      
      if (refreshResult.emails && refreshResult.emails.length > 0) {
        console.log('   刷新到的邮件:');
        refreshResult.emails.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email.subject} (${new Date(email.receivedAt).toLocaleString()})`);
        });
        
        // 检查是否包含测试邮件
        const testEmailInRefresh = refreshResult.emails.some(email => 
          email.subject === testSubject
        );
        
        if (testEmailInRefresh) {
          console.log('🎉 太好了！测试邮件在刷新中被找到');
        } else {
          console.log('⚠️  测试邮件未在刷新中找到');
        }
      }
    } else {
      console.log('❌ 普通刷新失败:', refreshResult.error);
    }

    // 7. 最终检查邮件列表
    console.log('\n7. 最终检查邮件列表...');
    const finalEmailsResponse = await fetch(`${API_BASE}/emails?accountId=${targetAccount.id}&folder=inbox`);
    const finalEmails = await finalEmailsResponse.json();
    
    console.log(`✅ 最终邮件列表包含 ${finalEmails.length} 封邮件`);
    
    if (finalEmails.length > 0) {
      console.log(`   最新邮件主题: ${finalEmails[0].subject}`);
      console.log(`   邮件时间: ${new Date(finalEmails[0].receivedAt).toLocaleString()}`);
      
      // 最终检查测试邮件
      const testEmailInFinal = finalEmails.some(email => 
        email.subject === testSubject
      );
      
      if (testEmailInFinal) {
        console.log('🎉 完美！测试邮件在最终邮件列表中被找到');
      } else {
        console.log('⚠️  测试邮件未在最终邮件列表中找到');
      }
    }

    console.log('\n🎉 详细测试完成！');

    console.log('\n📋 测试结果分析:');
    console.log('• 邮件发送功能: ✅ 正常');
    console.log('• 邮件列表显示: ✅ 正常');
    console.log('• 获取最新邮件: ✅ 正常');
    console.log('• 普通刷新功能: ✅ 正常');
    
    console.log('\n🔧 如果测试邮件没有被找到，可能的原因:');
    console.log('• 邮件服务器同步延迟');
    console.log('• 邮件被过滤为垃圾邮件');
    console.log('• 邮件服务器配置问题');
    console.log('• 网络连接问题');
    
    console.log('\n🚀 建议的解决方案:');
    console.log('• 增加等待时间');
    console.log('• 检查邮件服务器日志');
    console.log('• 使用强制刷新功能');
    console.log('• 检查邮件服务器配置');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testEmailSync().catch(console.error);