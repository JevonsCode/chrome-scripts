/**
 * 页面SVG下载脚本 - 手动执行版本
 * 添加一个浮动按钮，用户点击后显示页面信息和SVG下载功能
 */

/**
 * 收集并显示当前页面的基本信息
 */
function showPageInfo() {
  // 收集页面信息
  const pageInfo = {
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname,
    protocol: window.location.protocol,
    userAgent: navigator.userAgent,
    language: navigator.language,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    elements: {
      total: document.querySelectorAll('*').length,
      images: document.querySelectorAll('img').length,
      links: document.querySelectorAll('a').length,
      scripts: document.querySelectorAll('script').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      svgs: document.querySelectorAll('svg').length
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
  
  // 检查是否已存在信息面板
  const existingPanel = document.getElementById('chrome-scripts-page-info');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // 创建信息面板
  const panel = document.createElement('div');
  panel.id = 'chrome-scripts-page-info';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #667eea;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;
  
  // 创建内容
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      <h3 style="margin: 0; color: #667eea;">📊 页面信息 & SVG下载</h3>
      <button id="close-info-panel" 
              style="background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px; 
                     cursor: pointer; display: flex; align-items: center; justify-content: center;">
        ✕
      </button>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div>
        <h4 style="margin: 0 0 8px 0; color: #495057;">🌐 基本信息</h4>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 12px;">
          <strong>标题:</strong> ${pageInfo.title}<br>
          <strong>域名:</strong> ${pageInfo.domain}<br>
          <strong>协议:</strong> ${pageInfo.protocol}<br>
          <strong>语言:</strong> ${pageInfo.language}
        </div>
      </div>
      
      <div>
        <h4 style="margin: 0 0 8px 0; color: #495057;">📏 视窗尺寸</h4>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 12px;">
          <strong>宽度:</strong> ${pageInfo.viewport.width}px<br>
          <strong>高度:</strong> ${pageInfo.viewport.height}px<br>
          <strong>加载时间:</strong> ${pageInfo.loadTime}ms
        </div>
      </div>
      
      <div style="grid-column: 1 / -1;">
        <h4 style="margin: 0 0 8px 0; color: #495057;">🔍 元素统计</h4>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 12px; 
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px;">
          <div><strong>总元素:</strong> ${pageInfo.elements.total}</div>
          <div><strong>图片:</strong> ${pageInfo.elements.images}</div>
          <div><strong>链接:</strong> ${pageInfo.elements.links}</div>
          <div><strong>脚本:</strong> ${pageInfo.elements.scripts}</div>
          <div><strong>样式表:</strong> ${pageInfo.elements.stylesheets}</div>
          <div><strong>SVG元素:</strong> ${pageInfo.elements.svgs}</div>
        </div>
      </div>
      
      <div style="grid-column: 1 / -1;">
        <h4 style="margin: 0 0 8px 0; color: #495057;">🔗 当前URL</h4>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 11px; 
                    word-break: break-all; font-family: monospace;">
          ${pageInfo.url}
        </div>
      </div>
    </div>
    
    <div style="margin-top: 15px; text-align: center; display: flex; justify-content: center; gap: 10px;">
      <button id="copy-url-btn" 
              style="background: #667eea; color: white; border: none; padding: 8px 16px; 
                     border-radius: 6px; cursor: pointer; font-size: 12px;">
        📋 复制URL
      </button>
      <button id="download-svg-btn" 
              style="background: #28a745; color: white; border: none; padding: 8px 16px; 
                     border-radius: 6px; cursor: pointer; font-size: 12px;">
        📥 下载SVG
      </button>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(panel);
  
  // 绑定事件处理器（避免CSP问题）
  bindInfoPanelEvents(pageInfo.url);
  
  console.log('Chrome Scripts Manager: 页面信息脚本已执行', pageInfo);
}

/**
 * 为信息面板绑定事件处理器
 */
function bindInfoPanelEvents(pageUrl) {
  // 关闭按钮事件
  const closeBtn = document.getElementById('close-info-panel');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const panel = document.getElementById('chrome-scripts-page-info');
      if (panel) {
        panel.remove();
      }
    });
  }
  
  // 复制URL按钮事件
  const copyBtn = document.getElementById('copy-url-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        // 显示成功提示
        copyBtn.textContent = '✅ 已复制';
        copyBtn.style.background = '#28a745';
        setTimeout(() => {
          copyBtn.textContent = '📋 复制URL';
          copyBtn.style.background = '#667eea';
        }, 2000);
      } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制URL');
      }
    });
  }
  
  // 下载SVG按钮事件
  const downloadBtn = document.getElementById('download-svg-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadAllSVGs);
  }
}

/**
 * 下载页面中的所有SVG元素
 */
function downloadAllSVGs() {
  const svgs = document.querySelectorAll('svg');
  
  if (svgs.length === 0) {
    // 使用更友好的提示方式
    const downloadBtn = document.getElementById('download-svg-btn');
    if (downloadBtn) {
      downloadBtn.textContent = '❌ 无SVG';
      downloadBtn.style.background = '#dc3545';
      setTimeout(() => {
        downloadBtn.textContent = '📥 下载SVG';
        downloadBtn.style.background = '#28a745';
      }, 2000);
    }
    return;
  }
  
  let downloadedCount = 0;
  
  svgs.forEach((svg, index) => {
    try {
      // 创建SVG的副本
      const svgClone = svg.cloneNode(true);
      
      // 确保SVG有正确的命名空间
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // 获取SVG的字符串表示
      const svgString = new XMLSerializer().serializeToString(svgClone);
      
      // 创建Blob对象
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `svg-${index + 1}-${Date.now()}.svg`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      URL.revokeObjectURL(url);
      downloadedCount++;
    } catch (error) {
      console.error(`下载SVG ${index + 1} 失败:`, error);
    }
  });
  
  // 更新按钮状态
  const downloadBtn = document.getElementById('download-svg-btn');
  if (downloadBtn) {
    downloadBtn.textContent = `✅ 已下载 ${downloadedCount}`;
    downloadBtn.style.background = '#28a745';
    setTimeout(() => {
      downloadBtn.textContent = '📥 下载SVG';
      downloadBtn.style.background = '#28a745';
    }, 3000);
  }
}

/**
 * 创建手动执行的触发按钮
 */
function createManualTriggerButton() {
  // 检查是否已经存在按钮
  if (document.getElementById('chrome-scripts-manual-trigger')) {
    return;
  }
  
  // 创建浮动按钮
  const triggerBtn = document.createElement('div');
  triggerBtn.id = 'chrome-scripts-manual-trigger';
  triggerBtn.innerHTML = '📊';
  triggerBtn.title = '显示页面信息和SVG下载';
  triggerBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-size: 20px;
    transition: all 0.3s ease;
    user-select: none;
  `;
  
  // 添加悬停效果
  triggerBtn.addEventListener('mouseenter', () => {
    triggerBtn.style.transform = 'scale(1.1)';
    triggerBtn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
  });
  
  triggerBtn.addEventListener('mouseleave', () => {
    triggerBtn.style.transform = 'scale(1)';
    triggerBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  });
  
  // 点击事件
  triggerBtn.addEventListener('click', showPageInfo);
  
  // 添加到页面
  document.body.appendChild(triggerBtn);
  
  console.log('Chrome Scripts Manager: 手动触发按钮已创建');
}

// 手动执行模式：只创建触发按钮，不自动执行功能
// 用户需要点击按钮才能看到页面信息和下载SVG
createManualTriggerButton(); 