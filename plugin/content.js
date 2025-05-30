/**
 * Chrome Scripts Manager - Content Script
 * 运行在网页上下文中，负责脚本的注入和执行
 */

// 防止重复注入
if (!window.chromeScriptsManagerInjected) {
  window.chromeScriptsManagerInjected = true;
  
  /**
   * 监听来自background的脚本执行请求
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_CONTENT_SCRIPT') {
      try {
        // 在页面上下文中执行脚本
        injectScript(message.scriptContent, message.scriptName);
        sendResponse({ success: true });
      } catch (error) {
        console.error(`执行脚本 ${message.scriptName} 失败:`, error);
        sendResponse({ success: false, error: error.message });
      }
    }
    
    return true; // 异步响应
  });
  
  /**
   * 将脚本注入到页面上下文中执行
   */
  function injectScript(scriptContent, scriptName) {
    // 创建script元素
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        try {
          console.log('Chrome Scripts Manager: 执行脚本 - ${scriptName}');
          ${scriptContent}
        } catch (error) {
          console.error('Chrome Scripts Manager: 脚本执行错误 - ${scriptName}:', error);
        }
      })();
    `;
    
    // 注入到页面
    (document.head || document.documentElement).appendChild(script);
    
    // 执行后立即移除script标签
    script.remove();
    
    console.log(`Chrome Scripts Manager: 脚本 ${scriptName} 已注入执行`);
  }
  
  console.log('Chrome Scripts Manager: Content Script 已加载');
} 