/**
 * Chrome Scripts Manager - 弹窗脚本
 * 处理UI交互和脚本管理
 */

// DOM元素引用
const elements = {
  syncBtn: document.getElementById('syncBtn'),
  statusBar: document.getElementById('statusBar'),
  statusText: document.getElementById('statusText'),
  scriptsList: document.getElementById('scriptsList'),
  emptyState: document.getElementById('emptyState'),
  
  // 模态框元素
  modal: document.getElementById('scriptModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModal: document.getElementById('closeModal'),
  autoExecuteCheck: document.getElementById('autoExecuteCheck'),
  enabledCheck: document.getElementById('enabledCheck'),
  urlPatterns: document.getElementById('urlPatterns'),
  saveSettings: document.getElementById('saveSettings'),
  cancelSettings: document.getElementById('cancelSettings')
};

// 当前编辑的脚本名称
let currentEditingScript = null;

/**
 * 初始化弹窗
 */
async function initPopup() {
  await loadScripts();
  bindEvents();
  updateStatus('准备就绪');
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 同步按钮点击事件
  elements.syncBtn.addEventListener('click', syncScripts);
  
  // 模态框事件
  elements.closeModal.addEventListener('click', closeModal);
  elements.cancelSettings.addEventListener('click', closeModal);
  elements.saveSettings.addEventListener('click', saveScriptSettings);
  
  // 点击模态框背景关闭
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
      closeModal();
    }
  });
  
  // 监听来自background的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SCRIPTS_UPDATED') {
      loadScripts();
    }
  });
}

/**
 * 更新状态显示
 */
function updateStatus(text, type = 'normal') {
  elements.statusText.textContent = text;
  elements.statusBar.className = `status ${type}`;
}

/**
 * 同步脚本
 */
async function syncScripts() {
  elements.syncBtn.classList.add('syncing');
  updateStatus('正在同步脚本...', 'normal');
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SYNC_SCRIPTS' });
    
    if (response.success) {
      updateStatus('同步完成', 'success');
      await loadScripts();
    } else {
      updateStatus('同步失败: ' + (response.error || '未知错误'), 'error');
    }
  } catch (error) {
    console.error('同步失败:', error);
    updateStatus('同步失败: ' + error.message, 'error');
  } finally {
    elements.syncBtn.classList.remove('syncing');
  }
}

/**
 * 加载并显示脚本列表
 */
async function loadScripts() {
  try {
    const { scripts = {} } = await chrome.storage.local.get('scripts');
    renderScriptsList(scripts);
  } catch (error) {
    console.error('加载脚本失败:', error);
    updateStatus('加载脚本失败: ' + error.message, 'error');
  }
}

/**
 * 渲染脚本列表
 */
function renderScriptsList(scripts) {
  const scriptNames = Object.keys(scripts);
  
  if (scriptNames.length === 0) {
    elements.scriptsList.innerHTML = '';
    elements.emptyState.style.display = 'block';
    updateStatus('暂无脚本');
    return;
  }
  
  elements.emptyState.style.display = 'none';
  
  // 按名称排序
  scriptNames.sort();
  
  elements.scriptsList.innerHTML = scriptNames.map(scriptName => {
    const script = scripts[scriptName];
    return createScriptItemHTML(scriptName, script);
  }).join('');
  
  // 绑定脚本项事件
  bindScriptItemEvents();
  
  updateStatus(`已加载 ${scriptNames.length} 个脚本`, 'success');
}

/**
 * 创建脚本项HTML
 */
function createScriptItemHTML(scriptName, script) {
  const badges = [];
  
  if (!script.enabled) {
    badges.push('<span class="badge disabled">已禁用</span>');
  } else if (script.autoExecute) {
    badges.push('<span class="badge auto">自动</span>');
  } else {
    badges.push('<span class="badge manual">手动</span>');
  }
  
  const lastModified = script.lastModified ? 
    new Date(script.lastModified).toLocaleString('zh-CN') : '未知';
  
  const size = script.size ? formatFileSize(script.size) : '未知大小';
  
  return `
    <div class="script-item ${!script.enabled ? 'disabled' : ''}" data-script="${scriptName}">
      <div class="script-header">
        <div>
          <span class="script-name">${scriptName}</span>
          <div class="script-badges">${badges.join('')}</div>
        </div>
      </div>
      
      <div class="script-meta">
        大小: ${size} • 更新: ${lastModified}
      </div>
      
      <div class="script-actions">
        <button class="btn btn-primary execute-btn" 
                ${!script.enabled ? 'disabled' : ''}>
          执行
        </button>
        <button class="btn btn-secondary settings-btn">
          设置
        </button>
      </div>
    </div>
  `;
}

/**
 * 绑定脚本项事件
 */
function bindScriptItemEvents() {
  // 执行按钮事件
  document.querySelectorAll('.execute-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const scriptItem = e.target.closest('.script-item');
      const scriptName = scriptItem.dataset.script;
      await executeScript(scriptName);
    });
  });
  
  // 设置按钮事件
  document.querySelectorAll('.settings-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scriptItem = e.target.closest('.script-item');
      const scriptName = scriptItem.dataset.script;
      openScriptSettings(scriptName);
    });
  });
}

/**
 * 执行脚本
 */
async function executeScript(scriptName) {
  updateStatus(`正在执行脚本: ${scriptName}`, 'normal');
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_SCRIPT',
      scriptName: scriptName
    });
    
    if (response.success) {
      updateStatus(`脚本 ${scriptName} 执行成功`, 'success');
    } else {
      updateStatus(`执行失败: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('执行脚本失败:', error);
    updateStatus(`执行失败: ${error.message}`, 'error');
  }
}

/**
 * 打开脚本设置
 */
async function openScriptSettings(scriptName) {
  try {
    const { scripts = {} } = await chrome.storage.local.get('scripts');
    const script = scripts[scriptName];
    
    if (!script) {
      updateStatus('脚本不存在', 'error');
      return;
    }
    
    currentEditingScript = scriptName;
    elements.modalTitle.textContent = `${scriptName} - 脚本设置`;
    
    // 填充当前设置
    elements.autoExecuteCheck.checked = script.autoExecute || false;
    elements.enabledCheck.checked = script.enabled !== false;
    elements.urlPatterns.value = (script.urlPatterns || ['*://*/*']).join('\n');
    
    // 显示模态框
    elements.modal.style.display = 'flex';
    
  } catch (error) {
    console.error('打开设置失败:', error);
    updateStatus('打开设置失败: ' + error.message, 'error');
  }
}

/**
 * 关闭模态框
 */
function closeModal() {
  elements.modal.style.display = 'none';
  currentEditingScript = null;
}

/**
 * 保存脚本设置
 */
async function saveScriptSettings() {
  if (!currentEditingScript) {
    return;
  }
  
  try {
    // 解析URL模式
    const urlPatterns = elements.urlPatterns.value
      .split('\n')
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0);
    
    if (urlPatterns.length === 0) {
      urlPatterns.push('*://*/*'); // 默认匹配所有URL
    }
    
    const config = {
      autoExecute: elements.autoExecuteCheck.checked,
      enabled: elements.enabledCheck.checked,
      urlPatterns: urlPatterns
    };
    
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_SCRIPT_CONFIG',
      scriptName: currentEditingScript,
      config: config
    });
    
    if (response.success) {
      updateStatus('设置已保存', 'success');
      closeModal();
      await loadScripts(); // 重新加载脚本列表
    } else {
      updateStatus('保存失败: ' + response.error, 'error');
    }
    
  } catch (error) {
    console.error('保存设置失败:', error);
    updateStatus('保存失败: ' + error.message, 'error');
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPopup); 