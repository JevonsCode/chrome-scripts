/**
 * Chrome插件后台服务工作线程
 * 负责同步GitHub脚本和管理自动执行
 */

// GitHub仓库配置
const GITHUB_CONFIG = {
  owner: 'JevonsCode',
  repo: 'chrome-scripts',
  path: 'scripts',
  apiUrl: 'https://api.github.com/repos/JevonsCode/chrome-scripts/contents/scripts',
  rawUrl: 'https://raw.githubusercontent.com/JevonsCode/chrome-scripts/main/scripts'
};

// 同步间隔（分钟）
const SYNC_INTERVAL = 30;

/**
 * 获取GitHub API中的脚本列表
 */
async function fetchScriptsFromGitHub() {
  try {
    const response = await fetch(GITHUB_CONFIG.apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API请求失败: ${response.status}`);
    }
    
    const files = await response.json();
    // 过滤出.js文件
    return files.filter(file => file.name.endsWith('.js') && file.type === 'file');
  } catch (error) {
    console.error('获取GitHub脚本列表失败:', error);
    return [];
  }
}

/**
 * 下载单个脚本内容
 */
async function downloadScript(scriptFile) {
  try {
    const response = await fetch(`${GITHUB_CONFIG.rawUrl}/${scriptFile.name}`);
    if (!response.ok) {
      throw new Error(`下载脚本失败: ${response.status}`);
    }
    
    const content = await response.text();
    return {
      name: scriptFile.name,
      content: content,
      size: scriptFile.size,
      sha: scriptFile.sha,
      lastModified: new Date().toISOString()
    };
  } catch (error) {
    console.error(`下载脚本 ${scriptFile.name} 失败:`, error);
    return null;
  }
}

/**
 * 同步所有脚本
 */
async function syncScripts() {
  console.log('开始同步GitHub脚本...');
  
  try {
    // 获取远程脚本列表
    const remoteFiles = await fetchScriptsFromGitHub();
    if (remoteFiles.length === 0) {
      console.log('未找到远程脚本文件');
      return;
    }

    // 获取本地已存储的脚本
    const { scripts: localScripts = {} } = await chrome.storage.local.get('scripts');
    
    // 下载新的或更新的脚本
    const updatedScripts = { ...localScripts };
    
    for (const remoteFile of remoteFiles) {
      const localScript = localScripts[remoteFile.name];
      
      // 如果本地没有或SHA不匹配，则下载
      if (!localScript || localScript.sha !== remoteFile.sha) {
        console.log(`同步脚本: ${remoteFile.name}`);
        const scriptContent = await downloadScript(remoteFile);
        
        if (scriptContent) {
          updatedScripts[remoteFile.name] = {
            ...scriptContent,
            autoExecute: localScript?.autoExecute || false,
            enabled: localScript?.enabled !== false, // 默认启用
            urlPatterns: localScript?.urlPatterns || ['*://*/*'] // 默认匹配所有URL
          };
        }
      }
    }

    // 移除远程已删除的脚本
    const remoteFileNames = remoteFiles.map(f => f.name);
    for (const localFileName of Object.keys(localScripts)) {
      if (!remoteFileNames.includes(localFileName)) {
        console.log(`删除本地脚本: ${localFileName}`);
        delete updatedScripts[localFileName];
      }
    }

    // 保存更新后的脚本
    await chrome.storage.local.set({ scripts: updatedScripts });
    
    console.log(`脚本同步完成，共 ${Object.keys(updatedScripts).length} 个脚本`);
    
    // 通知popup更新
    chrome.runtime.sendMessage({ type: 'SCRIPTS_UPDATED' }).catch(() => {
      // 忽略如果popup未打开的错误
    });
    
  } catch (error) {
    console.error('同步脚本失败:', error);
  }
}

/**
 * 检查URL是否匹配模式
 */
function matchesPattern(url, patterns) {
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  });
}

/**
 * 在指定标签页执行脚本
 */
async function executeScriptInTab(tabId, scriptName, scriptContent) {
  try {
    // 方法1：直接注入脚本代码（最安全的方式）
    console.log(`开始执行脚本: ${scriptName}`);
    
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      code: `
        console.log('Chrome Scripts Manager: 执行脚本 - ${scriptName}');
        try {
          ${scriptContent}
        } catch (error) {
          console.error('Chrome Scripts Manager: 脚本执行错误 - ${scriptName}:', error);
        }
      `
    });
    
    console.log(`脚本 ${scriptName} 在标签页 ${tabId} 中执行成功`);
  } catch (error) {
    console.error(`执行脚本 ${scriptName} 失败:`, error);
  }
}

/**
 * 检查并执行自动脚本
 */
async function checkAndExecuteAutoScripts(tabId, url) {
  try {
    const { scripts = {} } = await chrome.storage.local.get('scripts');
    
    for (const [scriptName, script] of Object.entries(scripts)) {
      if (script.enabled && script.autoExecute && matchesPattern(url, script.urlPatterns)) {
        await executeScriptInTab(tabId, scriptName, script.content);
      }
    }
  } catch (error) {
    console.error('执行自动脚本失败:', error);
  }
}

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Chrome Scripts Manager 已安装');
  
  // 创建定时同步任务
  chrome.alarms.create('syncScripts', { periodInMinutes: SYNC_INTERVAL });
  
  // 立即同步一次
  await syncScripts();
});

// 监听定时任务
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncScripts') {
    await syncScripts();
  }
});

// 标签页更新时检查自动执行脚本
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await checkAndExecuteAutoScripts(tabId, tab.url);
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'SYNC_SCRIPTS':
        await syncScripts();
        sendResponse({ success: true });
        break;
        
      case 'EXECUTE_SCRIPT':
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const { scripts = {} } = await chrome.storage.local.get('scripts');
          const script = scripts[message.scriptName];
          if (script) {
            await executeScriptInTab(tab.id, message.scriptName, script.content);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: '脚本不存在' });
          }
        } else {
          sendResponse({ success: false, error: '无法获取当前标签页' });
        }
        break;
        
      case 'UPDATE_SCRIPT_CONFIG':
        const { scripts = {} } = await chrome.storage.local.get('scripts');
        if (scripts[message.scriptName]) {
          scripts[message.scriptName] = { ...scripts[message.scriptName], ...message.config };
          await chrome.storage.local.set({ scripts });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: '脚本不存在' });
        }
        break;
        
      default:
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    console.error('处理消息失败:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // 异步响应
}); 