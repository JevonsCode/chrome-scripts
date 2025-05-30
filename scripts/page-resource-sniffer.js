// ==UserScript==
// @name         页面资源嗅探器
// @description  全面的页面资源检测、预览和下载工具 - 支持图片、视频等多种格式
// @version      2.0.0
// @author       Chrome Scripts Manager
// @match        *://*/*
// @run-at       document-end
// @manual-trigger true
// ==/UserScript==

/**
 * 页面资源嗅探脚本
 * 功能：检测、预览和下载页面上的各种资源
 */

/**
 * 支持的资源类型配置
 */
const RESOURCE_TYPES = {
  image: {
    name: '图片',
    icon: '🖼️',
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'],
    mimeTypes: ['image/']
  },
  video: {
    name: '视频',
    icon: '🎬',
    extensions: ['mp4', 'webm', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'm4v'],
    mimeTypes: ['video/']
  },
  audio: {
    name: '音频',
    icon: '🎵',
    extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'],
    mimeTypes: ['audio/']
  }
};

/**
 * 全局变量
 */
let detectedResources = [];
let currentFilter = 'all';

/**
 * 检测页面中的所有资源
 */
function detectPageResources() {
  const resources = [];
  
  // 检测图片
  document.querySelectorAll('img').forEach((img, index) => {
    if (img.src && img.src !== window.location.href) {
      resources.push({
        type: 'image',
        url: img.src,
        element: img,
        filename: getFilenameFromUrl(img.src) || `image-${index + 1}`,
        size: { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
      });
    }
  });
  
  // 检测视频
  document.querySelectorAll('video').forEach((video, index) => {
    if (video.src) {
      resources.push({
        type: 'video',
        url: video.src,
        element: video,
        filename: getFilenameFromUrl(video.src) || `video-${index + 1}`,
        size: { width: video.videoWidth, height: video.videoHeight }
      });
    }
    
    video.querySelectorAll('source').forEach((source, sourceIndex) => {
      if (source.src) {
        resources.push({
          type: 'video',
          url: source.src,
          element: source,
          filename: getFilenameFromUrl(source.src) || `video-${index + 1}-${sourceIndex + 1}`
        });
      }
    });
  });
  
  // 检测音频
  document.querySelectorAll('audio').forEach((audio, index) => {
    if (audio.src) {
      resources.push({
        type: 'audio',
        url: audio.src,
        element: audio,
        filename: getFilenameFromUrl(audio.src) || `audio-${index + 1}`
      });
    }
    
    audio.querySelectorAll('source').forEach((source, sourceIndex) => {
      if (source.src) {
        resources.push({
          type: 'audio',
          url: source.src,
          element: source,
          filename: getFilenameFromUrl(source.src) || `audio-${index + 1}-${sourceIndex + 1}`
        });
      }
    });
  });
  
  // 检测背景图片
  document.querySelectorAll('*').forEach((element, index) => {
    const style = window.getComputedStyle(element);
    const backgroundImage = style.backgroundImage;
    
    if (backgroundImage && backgroundImage !== 'none') {
      const matches = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/g);
      if (matches) {
        matches.forEach((match, matchIndex) => {
          const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
          if (url && !url.startsWith('data:') && isValidImageUrl(url)) {
            resources.push({
              type: 'image',
              url: resolveUrl(url),
              element: element,
              filename: getFilenameFromUrl(url) || `bg-image-${index + 1}-${matchIndex + 1}`,
              source: 'background'
            });
          }
        });
      }
    }
  });
  
  // 检测SVG
  document.querySelectorAll('svg').forEach((svg, index) => {
    try {
      const svgClone = svg.cloneNode(true);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgString = new XMLSerializer().serializeToString(svgClone);
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
      
      resources.push({
        type: 'image',
        url: dataUrl,
        element: svg,
        filename: `inline-svg-${index + 1}.svg`,
        source: 'inline-svg'
      });
    } catch (error) {
      console.warn('处理SVG时出错:', error);
    }
  });
  
  return deduplicateResources(resources);
}

/**
 * 辅助函数
 */
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url, window.location.href);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename && filename.includes('.') ? filename : null;
  } catch (error) {
    return null;
  }
}

function resolveUrl(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch (error) {
    return url;
  }
}

function isValidImageUrl(url) {
  if (!url || url.length < 4) return false;
  const extension = url.split('.').pop()?.toLowerCase();
  return RESOURCE_TYPES.image.extensions.includes(extension);
}

function deduplicateResources(resources) {
  const seen = new Set();
  return resources.filter(resource => {
    const key = resource.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 创建资源嗅探器主界面
 */
function createResourceSnifferPanel() {
  const existingPanel = document.getElementById('chrome-scripts-resource-sniffer');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  detectedResources = detectPageResources();
  
  const panel = document.createElement('div');
  panel.id = 'chrome-scripts-resource-sniffer';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #667eea;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    width: 90vw;
    max-width: 1000px;
    height: 80vh;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  `;
  
  const stats = getResourceStats();
  
  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #eee;">
      <h3 style="margin: 0; color: #667eea;">📁 页面资源嗅探器 (共${stats.total}个)</h3>
      <button id="close-sniffer-panel" 
              style="background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px; 
                     cursor: pointer; display: flex; align-items: center; justify-content: center;">
        ✕
      </button>
    </div>
    
    <div style="padding: 15px; border-bottom: 1px solid #eee;">
      <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
        <button class="filter-btn" data-type="all" 
                style="padding: 8px 16px; border: 1px solid #667eea; background: #667eea; color: white; 
                       border-radius: 6px; cursor: pointer; font-size: 12px;">
          全部 (${stats.total})
        </button>
        ${Object.entries(RESOURCE_TYPES).map(([type, config]) => 
          `<button class="filter-btn" data-type="${type}" 
                   style="padding: 8px 16px; border: 1px solid #667eea; background: white; color: #667eea; 
                          border-radius: 6px; cursor: pointer; font-size: 12px;">
             ${config.icon} ${config.name} (${stats[type] || 0})
           </button>`
        ).join('')}
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center;">
        <button id="select-all-btn" 
                style="padding: 6px 12px; border: 1px solid #28a745; background: white; color: #28a745; 
                       border-radius: 4px; cursor: pointer; font-size: 11px;">
          全选
        </button>
        <button id="download-selected-btn" 
                style="padding: 6px 12px; border: none; background: #28a745; color: white; 
                       border-radius: 4px; cursor: pointer; font-size: 11px;">
          📥 下载选中 (0)
        </button>
      </div>
    </div>
    
    <div id="resource-list" style="flex: 1; overflow-y: auto; padding: 15px;">
      <!-- 资源列表 -->
    </div>
  `;
  
  document.body.appendChild(panel);
  bindEvents();
  updateResourceDisplay();
  
  console.log('资源嗅探器已启动，检测到', detectedResources.length, '个资源');
}

/**
 * 获取资源统计
 */
function getResourceStats() {
  const stats = { total: detectedResources.length };
  Object.keys(RESOURCE_TYPES).forEach(type => {
    stats[type] = detectedResources.filter(resource => resource.type === type).length;
  });
  return stats;
}

/**
 * 更新资源显示
 */
function updateResourceDisplay() {
  const resourceList = document.getElementById('resource-list');
  if (!resourceList) return;
  
  const filteredResources = currentFilter === 'all' 
    ? detectedResources 
    : detectedResources.filter(resource => resource.type === currentFilter);
  
  if (filteredResources.length === 0) {
    resourceList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
        <div>没有找到${currentFilter === 'all' ? '' : RESOURCE_TYPES[currentFilter]?.name || ''}资源</div>
      </div>
    `;
    return;
  }
  
  resourceList.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
      ${filteredResources.map((resource, index) => createResourceCard(resource, index)).join('')}
    </div>
  `;
  
  bindResourceCardEvents();
}

/**
 * 创建资源卡片
 */
function createResourceCard(resource, index) {
  const typeConfig = RESOURCE_TYPES[resource.type] || { icon: '📄' };
  const isPreviewable = resource.type === 'image' || resource.type === 'video';
  
  return `
    <div class="resource-card" data-index="${index}" 
         style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: white; 
                transition: all 0.2s ease; cursor: pointer;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 16px;">${typeConfig.icon}</span>
        <input type="checkbox" class="resource-checkbox" data-index="${index}" style="cursor: pointer;">
      </div>
      
      ${isPreviewable ? createPreviewHTML(resource) : ''}
      
      <div style="font-size: 11px; color: #666; margin-bottom: 6px; word-break: break-all;">
        ${resource.filename}
      </div>
      
      ${resource.size ? `
        <div style="font-size: 10px; color: #999; margin-bottom: 8px;">
          ${resource.size.width} × ${resource.size.height}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 5px;">
        ${isPreviewable ? `
          <button class="preview-btn" data-index="${index}" 
                  style="flex: 1; padding: 4px 8px; border: 1px solid #007bff; background: white; 
                         color: #007bff; border-radius: 4px; cursor: pointer; font-size: 10px;">
            👁️ 预览
          </button>
        ` : ''}
        <button class="download-btn" data-index="${index}" 
                style="flex: 1; padding: 4px 8px; border: none; background: #28a745; color: white; 
                       border-radius: 4px; cursor: pointer; font-size: 10px;">
          📥 下载
        </button>
      </div>
    </div>
  `;
}

/**
 * 创建预览HTML
 */
function createPreviewHTML(resource) {
  if (resource.type === 'image') {
    return `
      <div style="height: 120px; background: #f8f9fa; border-radius: 4px; margin-bottom: 8px; 
                  display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <img src="${resource.url}" 
             style="max-width: 100%; max-height: 100%; object-fit: contain;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div style="display: none; color: #666; font-size: 10px;">预览失败</div>
      </div>
    `;
  } else if (resource.type === 'video') {
    return `
      <div style="height: 120px; background: #f8f9fa; border-radius: 4px; margin-bottom: 8px; 
                  display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <video src="${resource.url}" muted style="max-width: 100%; max-height: 100%; object-fit: contain;">
        </video>
      </div>
    `;
  }
  return '';
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 关闭按钮
  document.getElementById('close-sniffer-panel')?.addEventListener('click', () => {
    document.getElementById('chrome-scripts-resource-sniffer')?.remove();
  });
  
  // 筛选按钮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // 更新按钮样式
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.background = 'white';
        b.style.color = '#667eea';
      });
      btn.style.background = '#667eea';
      btn.style.color = 'white';
      
      currentFilter = btn.dataset.type;
      updateResourceDisplay();
    });
  });
  
  // 全选按钮
  document.getElementById('select-all-btn')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.resource-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => cb.checked = !allChecked);
    updateDownloadButton();
  });
  
  // 下载选中按钮
  document.getElementById('download-selected-btn')?.addEventListener('click', downloadSelectedResources);
}

/**
 * 绑定资源卡片事件
 */
function bindResourceCardEvents() {
  // 复选框事件
  document.querySelectorAll('.resource-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateDownloadButton);
  });
  
  // 预览按钮事件
  document.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const resource = getFilteredResources()[index];
      if (resource) showResourcePreview(resource);
    });
  });
  
  // 下载按钮事件
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const resource = getFilteredResources()[index];
      if (resource) downloadResource(resource, btn);
    });
  });
  
  // 卡片点击事件
  document.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', () => {
      const checkbox = card.querySelector('.resource-checkbox');
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        updateDownloadButton();
      }
    });
  });
}

function getFilteredResources() {
  return currentFilter === 'all' 
    ? detectedResources 
    : detectedResources.filter(resource => resource.type === currentFilter);
}

function updateDownloadButton() {
  const checkboxes = document.querySelectorAll('.resource-checkbox:checked');
  const downloadBtn = document.getElementById('download-selected-btn');
  if (downloadBtn) {
    downloadBtn.textContent = `📥 下载选中 (${checkboxes.length})`;
  }
}

/**
 * 显示资源预览
 */
function showResourcePreview(resource) {
  const existingPreview = document.getElementById('resource-preview-modal');
  if (existingPreview) existingPreview.remove();
  
  const modal = document.createElement('div');
  modal.id = 'resource-preview-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 10002;
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;
  
  let previewContent = '';
  if (resource.type === 'image') {
    previewContent = `<img src="${resource.url}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
  } else if (resource.type === 'video') {
    previewContent = `<video src="${resource.url}" controls style="max-width: 100%; max-height: 100%;">`;
  }
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 8px; padding: 20px; max-width: 90%; max-height: 90%; 
                display: flex; flex-direction: column; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h4 style="margin: 0; color: #333;">${resource.filename}</h4>
        <button onclick="this.closest('#resource-preview-modal').remove()" 
                style="background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px; 
                       cursor: pointer;">✕</button>
      </div>
      <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
        ${previewContent}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

/**
 * 下载资源
 */
async function downloadResource(resource, button) {
  try {
    const originalText = button.textContent;
    button.textContent = '⏳ 下载中...';
    
    if (resource.url.startsWith('data:')) {
      downloadDataUrl(resource.url, resource.filename);
    } else {
      await downloadUrl(resource.url, resource.filename);
    }
    
    button.textContent = '✅ 完成';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
    
  } catch (error) {
    console.error('下载失败:', error);
    button.textContent = '❌ 失败';
    setTimeout(() => {
      button.textContent = '📥 下载';
    }, 2000);
  }
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function downloadUrl(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

async function downloadSelectedResources() {
  const checkboxes = document.querySelectorAll('.resource-checkbox:checked');
  
  if (checkboxes.length === 0) {
    alert('请先选择要下载的资源');
    return;
  }
  
  for (const checkbox of checkboxes) {
    const index = parseInt(checkbox.dataset.index);
    const resource = getFilteredResources()[index];
    
    if (resource) {
      try {
        if (resource.url.startsWith('data:')) {
          downloadDataUrl(resource.url, resource.filename);
        } else {
          await downloadUrl(resource.url, resource.filename);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('下载失败:', resource.filename, error);
      }
    }
  }
}

/**
 * 创建触发按钮 - 使用SVG图标
 */
function createManualTriggerButton() {
  if (document.getElementById('chrome-scripts-resource-trigger')) {
    return;
  }
  
  const triggerBtn = document.createElement('div');
  triggerBtn.id = 'chrome-scripts-resource-trigger';
  triggerBtn.title = '页面资源嗅探器';
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
    transition: all 0.3s ease;
    user-select: none;
  `;
  
  // 简洁的文件夹搜索SVG图标
  triggerBtn.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6C2 4.89543 2.89543 4 4 4H9L11 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" 
            stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.1)"/>
      <circle cx="12" cy="12" r="3" stroke="white" stroke-width="1.5" fill="none"/>
      <path d="M14.5 14.5L17 17" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;
  
  // 悬停效果
  triggerBtn.addEventListener('mouseenter', () => {
    triggerBtn.style.transform = 'scale(1.1)';
    triggerBtn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
  });
  
  triggerBtn.addEventListener('mouseleave', () => {
    triggerBtn.style.transform = 'scale(1)';
    triggerBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  });
  
  // 点击事件
  triggerBtn.addEventListener('click', createResourceSnifferPanel);
  
  document.body.appendChild(triggerBtn);
  console.log('资源嗅探器触发按钮已创建');
}

// 初始化
createManualTriggerButton(); 