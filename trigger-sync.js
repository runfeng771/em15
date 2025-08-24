const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function triggerSync() {
  try {
    console.log('=== 触发邮件同步 ===\n');
    
    // 获取所有账号
    const { stdout: accountsOutput } = await execAsync('curl -s http://localhost:3000/api/accounts');
    const accounts = JSON.parse(accountsOutput);
    
    console.log(`找到 ${accounts.length} 个账号`);
    
    // 需要同步的账号
    const accountsToSync = ['99@HH.email.cn', 'Steven@HH.email.cn'];
    
    for (const accountEmail of accountsToSync) {
      const account = accounts.find(a => a.email === accountEmail);
      if (!account) {
        console.log(`❌ 账号不存在: ${accountEmail}`);
        continue;
      }
      
      console.log(`\n--- 同步账号: ${accountEmail} ---`);
      console.log(`账号ID: ${account.id}`);
      
      try {
        // 调用fetch-all API来重新获取所有邮件
        console.log('调用 fetch-all API...');
        
        const { stdout: syncOutput } = await execAsync(
          `curl -s -X POST http://localhost:3000/api/fetch-all -H "Content-Type: application/json" -d '{"accountId": "${account.id}"}'`
        );
        
        const result = JSON.parse(syncOutput);
        
        if (result.count !== undefined) {
          console.log(`✅ 同步成功！`);
          console.log(`获取到 ${result.count} 封邮件`);
        } else {
          console.log(`❌ 同步失败: ${result.error}`);
        }
        
      } catch (error) {
        console.error(`❌ 调用API失败:`, error.message);
      }
    }
    
    console.log('\n=== 同步完成 ===');
    
    // 验证同步结果
    console.log('\n=== 验证同步结果 ===');
    for (const accountEmail of accountsToSync) {
      const account = accounts.find(a => a.email === accountEmail);
      if (account) {
        try {
          const { stdout: emailsOutput } = await execAsync(
            `curl -s "http://localhost:3000/api/emails?accountId=${account.id}&folder=inbox"`
          );
          const emails = JSON.parse(emailsOutput);
          
          console.log(`${accountEmail}: ${emails.length} 封邮件`);
        } catch (error) {
          console.error(`获取 ${accountEmail} 邮件数量失败:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('触发同步失败:', error);
  }
}

triggerSync();