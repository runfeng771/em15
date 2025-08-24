#!/usr/bin/env node

// 测试脚本 - 验证邮件系统API功能

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 开始测试邮件系统API...\n');

  // 测试1: 获取邮件账号列表
  console.log('1. 测试获取邮件账号列表...');
  try {
    const response = await fetch(`${API_BASE}/accounts`);
    const data = await response.json();
    console.log(`✅ 成功获取 ${data.length} 个邮件账号`);
    console.log(`   第一个账号: ${data[0]?.email || '无'}`);
  } catch (error) {
    console.log('❌ 获取邮件账号失败:', error.message);
  }

  // 测试2: 获取邮件列表
  console.log('\n2. 测试获取邮件列表...');
  try {
    const accountsResponse = await fetch(`${API_BASE}/accounts`);
    const accounts = await accountsResponse.json();
    
    if (accounts.length > 0) {
      const emailResponse = await fetch(`${API_BASE}/emails?accountId=${accounts[0].id}&folder=inbox`);
      const emails = await emailResponse.json();
      console.log(`✅ 成功获取 ${emails.length} 封邮件`);
      console.log(`   第一封邮件: ${emails[0]?.subject || '无'}`);
    } else {
      console.log('❌ 没有可用的邮件账号');
    }
  } catch (error) {
    console.log('❌ 获取邮件列表失败:', error.message);
  }

  // 测试3: 添加新账号
  console.log('\n3. 测试添加新账号...');
  try {
    const newAccount = {
      email: 'test@example.com',
      password: 'test123',
      imapServer: 'imap.example.com',
      imapPort: 993,
      smtpServer: 'smtp.example.com',
      smtpPort: 587
    };
    
    const response = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newAccount)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 成功添加新账号:', data.email);
      
      // 测试4: 删除账号
      console.log('\n4. 测试删除账号...');
      try {
        const deleteResponse = await fetch(`${API_BASE}/accounts/${data.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log('✅ 成功删除账号');
        } else {
          console.log('❌ 删除账号失败');
        }
      } catch (error) {
        console.log('❌ 删除账号失败:', error.message);
      }
    } else {
      console.log('❌ 添加账号失败');
    }
  } catch (error) {
    console.log('❌ 添加账号失败:', error.message);
  }

  // 测试5: 刷新邮件
  console.log('\n5. 测试刷新邮件...');
  try {
    const accountsResponse = await fetch(`${API_BASE}/accounts`);
    const accounts = await accountsResponse.json();
    
    if (accounts.length > 0) {
      const refreshResponse = await fetch(`${API_BASE}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: accounts[0].id })
      });
      
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        console.log('✅ 成功刷新邮件');
        console.log(`   新增邮件数: ${data.count || 0}`);
      } else {
        console.log('❌ 刷新邮件失败');
      }
    } else {
      console.log('❌ 没有可用的邮件账号');
    }
  } catch (error) {
    console.log('❌ 刷新邮件失败:', error.message);
  }

  console.log('\n🎉 API测试完成！');
}

// 运行测试
testAPI().catch(console.error);