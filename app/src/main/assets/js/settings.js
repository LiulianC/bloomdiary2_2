/**
 * 设置模块 - 管理应用设置和数据
 */
const SettingsModule = (() => {
    // ===== 新增：在 WebView/APK 环境中替代 prompt/confirm 的通用模态对话框 =====
    const openInlineConfirm = ({ title = '确认操作', message = '确定继续吗？', confirmText = '确认', cancelText = '取消' } = {}) => {
        return new Promise(resolve => {
            const overlay = document.getElementById('modal-overlay');
            const settingsModal = document.getElementById('settings-modal');
            // 隐藏设置弹窗，避免双层滚动
            const restoreSettings = settingsModal && !settingsModal.classList.contains('hidden');
            if (overlay) overlay.classList.remove('hidden');
            if (restoreSettings) settingsModal.classList.add('hidden');

            const dlg = document.createElement('div');
            dlg.className = 'modal';
            dlg.innerHTML = `
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px;">${message}</p>
                    <div class="form-actions">
                        <button class="danger-btn" data-confirm="true">${confirmText}</button>
                        <button class="secondary-btn" data-cancel="true">${cancelText}</button>
                    </div>
                </div>
            `;
            overlay.appendChild(dlg);

            const cleanup = () => {
                if (overlay && dlg && dlg.parentNode === overlay) {
                    overlay.removeChild(dlg);
                }
                if (restoreSettings) {
                    settingsModal.classList.remove('hidden');
                } else if (!document.querySelector('#modal-overlay .modal:not(#settings-modal)')) {
                    // 如果没有其他自建对话框，且设置面板本就未显示，则关闭遮罩
                    const anyVisible = document.querySelector('.modal:not(.hidden)');
                    if (!anyVisible) overlay.classList.add('hidden');
                }
            };

            dlg.querySelector('.close-modal').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            dlg.querySelector('[data-cancel]').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            dlg.querySelector('[data-confirm]').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
        });
    };

    const openInlinePrompt = ({ title = '输入', label = '请输入内容', defaultValue = '', placeholder = '', confirmText = '确定', cancelText = '取消', validator } = {}) => {
        return new Promise(resolve => {
            const overlay = document.getElementById('modal-overlay');
            const settingsModal = document.getElementById('settings-modal');
            const restoreSettings = settingsModal && !settingsModal.classList.contains('hidden');
            if (overlay) overlay.classList.remove('hidden');
            if (restoreSettings) settingsModal.classList.add('hidden');

            const dlg = document.createElement('div');
            dlg.className = 'modal';
            dlg.innerHTML = `
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>${label}</label>
                        <input type="text" id="inline-prompt-input" value="${defaultValue.replace(/"/g, '&quot;')}" placeholder="${placeholder.replace(/"/g, '&quot;')}" />
                        <div id="inline-prompt-error" class="setting-desc" style="color:#ef6c75;margin-top:8px;display:none;"></div>
                    </div>
                    <div class="form-actions">
                        <button class="primary-btn" data-confirm="true">${confirmText}</button>
                        <button class="secondary-btn" data-cancel="true">${cancelText}</button>
                    </div>
                </div>
            `;
            overlay.appendChild(dlg);

            const input = dlg.querySelector('#inline-prompt-input');
            const error = dlg.querySelector('#inline-prompt-error');

            const cleanup = () => {
                if (overlay && dlg && dlg.parentNode === overlay) {
                    overlay.removeChild(dlg);
                }
                if (restoreSettings) {
                    settingsModal.classList.remove('hidden');
                } else if (!document.querySelector('#modal-overlay .modal:not(#settings-modal)')) {
                    const anyVisible = document.querySelector('.modal:not(.hidden)');
                    if (!anyVisible) overlay.classList.add('hidden');
                }
            };

            const tryConfirm = () => {
                const value = (input.value || '').trim();
                if (validator) {
                    const msg = validator(value);
                    if (msg) {
                        error.textContent = msg;
                        error.style.display = 'block';
                        return false;
                    }
                }
                cleanup();
                resolve(value);
                return true;
            };

            dlg.querySelector('.close-modal').addEventListener('click', () => { cleanup(); resolve(null); });
            dlg.querySelector('[data-cancel]').addEventListener('click', () => { cleanup(); resolve(null); });
            dlg.querySelector('[data-confirm]').addEventListener('click', () => { tryConfirm(); });

            // 回车提交，ESC 取消
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    tryConfirm();
                } else if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
            });

            setTimeout(() => input && input.focus(), 0);
        });
    };
    // ===== 新增结束 =====

    const initialize = () => {
        // 设置按钮点击事件
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            // 移除可能的旧事件监听器
            const newSettingsBtn = settingsBtn.cloneNode(true);
            settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
            
            // 重新绑定事件，添加错误处理
            newSettingsBtn.addEventListener('click', function() {
                try {
                    console.log('设置按钮被点击');
                    openSettingsModal();
                } catch (error) {
                    console.error('打开设置失败:', error);
                    NotificationsModule.showNotification('设置打开失败', '请刷新页面后重试');
                }
            });
        }
        
        // 保存设置按钮
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            const newSaveBtn = saveSettingsBtn.cloneNode(true);
            saveSettingsBtn.parentNode.replaceChild(newSaveBtn, saveSettingsBtn);
            
            newSaveBtn.addEventListener('click', function() {
                try {
                    saveSettings();
                } catch (error) {
                    console.error('保存设置失败:', error);
                    NotificationsModule.showNotification('保存失败', error.message);
                }
            });
        }
        
        // 导出所有数据按钮
        const exportDataBtn = document.getElementById('export-all-data');
        if (exportDataBtn) {
            const newExportBtn = exportDataBtn.cloneNode(true);
            exportDataBtn.parentNode.replaceChild(newExportBtn, exportDataBtn);
            
            newExportBtn.addEventListener('click', function() {
                try {
                    exportAllData();
                } catch (error) {
                    console.error('导出数据失败:', error);
                    NotificationsModule.showNotification('导出失败', error.message);
                }
            });
        }
        
        // 导入数据按钮
        const importDataBtn = document.getElementById('import-data');
        if (importDataBtn) {
            const newImportBtn = importDataBtn.cloneNode(true);
            importDataBtn.parentNode.replaceChild(newImportBtn, importDataBtn);
            
            newImportBtn.addEventListener('click', function() {
                try {
                    // 修改为新的ID
                    document.getElementById('settings-import-file-input').click();
                } catch (error) {
                    console.error('打开文件选择失败:', error);
                    NotificationsModule.showNotification('导入失败', error.message);
                }
            });
        }

        // 文件选择输入 - 修改为新的ID
        const importFileInput = document.getElementById('settings-import-file-input');
        if (importFileInput) {
            const newFileInput = importFileInput.cloneNode(true);
            importFileInput.parentNode.replaceChild(newFileInput, importFileInput);
            
            newFileInput.addEventListener('change', function(e) {
                try {
                    handleFileImport(e);
                } catch (error) {
                    console.error('处理文件导入失败:', error);
                    NotificationsModule.showNotification('导入失败', error.message);
                }
            });
        }
        
        // 自动备份开关
        const autoBackupToggle = document.getElementById('auto-backup-toggle');
        if (autoBackupToggle) {
            const newToggle = autoBackupToggle.cloneNode(true);
            autoBackupToggle.parentNode.replaceChild(newToggle, autoBackupToggle);
            
            newToggle.addEventListener('change', function(e) {
                try {
                    const settings = StorageService.getSettings();
                    StorageService.updateSettings({
                        autoBackupEnabled: e.target.checked
                    });
                    NotificationsModule.showNotification('设置已更新', 
                        e.target.checked ? '已启用每日自动备份' : '已禁用每日自动备份');
                } catch (error) {
                    console.error('更新自动备份设置失败:', error);
                }
            });
        }
        
        // 清除数据按钮
        const clearDataBtn = document.getElementById('clear-data');
        if (clearDataBtn) {
            const newClearBtn = clearDataBtn.cloneNode(true);
            clearDataBtn.parentNode.replaceChild(newClearBtn, clearDataBtn);
            
            newClearBtn.addEventListener('click', function() {
                try {
                    confirmClearData();
                } catch (error) {
                    console.error('清除数据失败:', error);
                    NotificationsModule.showNotification('操作失败', error.message);
                }
            });
        }
        
        // 开发者模式切换
        const devModeToggle = document.getElementById('dev-mode-toggle');
        if (devModeToggle) {
            const newToggle = devModeToggle.cloneNode(true);
            devModeToggle.parentNode.replaceChild(newToggle, devModeToggle);
            
            newToggle.addEventListener('change', function(e) {
                try {
                    toggleDevMode(e.target.checked);
                } catch (error) {
                    console.error('切换开发者模式失败:', error);
                }
            });
        }
        
        // 开发者选项按钮
        document.getElementById('add-test-data')?.addEventListener('click', function() {
            try {
                addTestData();
            } catch (error) {
                console.error('添加测试数据失败:', error);
                NotificationsModule.showNotification('操作失败', error.message);
            }
        });
        
        document.getElementById('reset-today')?.addEventListener('click', function() {
            try {
                resetTodayData();
            } catch (error) {
                console.error('重置今日数据失败:', error);
                NotificationsModule.showNotification('操作失败', error.message);
            }
        });

        // 新增：重置“今日睡眠记录”真实绑定
        document.getElementById('reset-sleep-today')?.addEventListener('click', function() {
            try {
                resetTodaySleepRecord();
            } catch (e) {
                console.error(e);
                NotificationsModule.showNotification('操作失败', e.message || '未知错误');
            }
        });        
        
        // 加载当前设置
        try {
            loadCurrentSettings();
        } catch (error) {
            console.error('加载设置失败:', error);
        }
        
        // 修复关闭模态框按钮
        document.querySelectorAll('#settings-modal .close-modal').forEach(function(btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function() {
                document.getElementById('modal-overlay').classList.add('hidden');
                document.getElementById('settings-modal').classList.add('hidden');
            });
        });
    };
    
    // 初始化文件保险库管理器
    const initializeVaultManager = async () => {
        try {
            // 初始化FileVault
            const vaultAvailable = await FileVault.initialize();
            
            // 更新存储信息显示
            const vaultStorageInfo = document.getElementById('vault-storage-info');
            if (vaultStorageInfo) {
                if (vaultAvailable) {
                    vaultStorageInfo.textContent = FileVault.isAvailable() ? 
                        '存储方式：数据文件夹已启用 (OPFS)' : 
                        '存储方式：数据文件夹已启用 (localStorage)';
                } else {
                    vaultStorageInfo.textContent = '存储方式：降级到下载模式';
                }
            }
            
            // 更新文件夹名称
            const vaultFolderName = document.getElementById('vault-folder-name');
            if (vaultFolderName) {
                vaultFolderName.textContent = FileVault.getFolderName();
            }
            
            // 设置刷新按钮事件
            setupVaultRefreshButton();
            
            // 加载文件列表
            await loadVaultFileList();
        } catch (error) {
            console.error('初始化文件保险库管理器失败:', error);
            const vaultFileList = document.getElementById('vault-file-list');
            if (vaultFileList) {
                vaultFileList.innerHTML = `<div class="loading-message">初始化失败: ${error.message}</div>`;
            }
        }
    };
    
    // 设置刷新按钮事件
    const setupVaultRefreshButton = () => {
        const refreshBtn = document.getElementById('refresh-vault-files');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
            
            newRefreshBtn.addEventListener('click', async function() {
                try {
                    newRefreshBtn.disabled = true;
                    newRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
                    await loadVaultFileList();
                } catch (error) {
                    console.error('刷新文件列表失败:', error);
                    NotificationsModule.showNotification('刷新失败', error.message);
                } finally {
                    newRefreshBtn.disabled = false;
                    newRefreshBtn.innerHTML = '<i class="fas fa-sync"></i> 刷新文件列表';
                }
            });
        }
    };
    
    // 加载文件保险库文件列表
    const loadVaultFileList = async () => {
        const vaultFileList = document.getElementById('vault-file-list');
        if (!vaultFileList) return;
        
        try {
            vaultFileList.innerHTML = '<div class="loading-message">加载文件列表中...</div>';
            
            const files = await FileVault.listFiles();
            
            if (files.length === 0) {
                vaultFileList.innerHTML = `
                    <div class="empty-vault-message">
                        <i class="fas fa-folder-open"></i>
                        <p>数据文件夹为空</p>
                        <p>导出数据或自动备份后文件将出现在这里</p>
                    </div>
                `;
                return;
            }
            
            // 渲染文件列表（保持内联 onclick 以减少改动）
            const fileListHTML = files.map(file => `
                <div class="vault-file-item">
                    <div class="vault-file-info">
                        <div class="vault-file-name">${file.name}</div>
                        <div class="vault-file-details">
                            <span>大小: ${FileVault.formatFileSize(file.size)}</span>
                            <span>修改时间: ${FileVault.formatDate(file.lastModified)}</span>
                        </div>
                    </div>
                    <div class="vault-file-actions">
                        <button class="import-btn" onclick="SettingsModule.importVaultFile('${file.name}')">
                            导入
                        </button>
                        <button onclick="SettingsModule.renameVaultFile('${file.name}')">
                            重命名
                        </button>
                        <button class="danger" onclick="SettingsModule.deleteVaultFile('${file.name}')">
                            删除
                        </button>
                    </div>
                </div>
            `).join('');
            
            vaultFileList.innerHTML = fileListHTML;
        } catch (error) {
            console.error('加载文件列表失败:', error);
            vaultFileList.innerHTML = `<div class="loading-message">加载失败: ${error.message}</div>`;
        }
    };
    
    // 从文件保险库导入文件
    const importVaultFile = async (fileName) => {
        try {
            const fileContent = await FileVault.readFile(fileName);
            if (!fileContent) {
                throw new Error('无法读取文件内容');
            }
            
            // 使用现有的导入流程
            importData(fileContent);
        } catch (error) {
            console.error('从文件保险库导入失败:', error);
            NotificationsModule.showNotification('导入失败', `无法导入文件 ${fileName}: ${error.message}`);
        }
    };
    
    // 重命名文件保险库文件（改为使用内置模态，兼容 APK/WebView）
    const renameVaultFile = async (oldName) => {
        try {
            const newName = await openInlinePrompt({
                title: '重命名文件',
                label: '新的文件名',
                defaultValue: oldName,
                placeholder: '例如：backup_2025-08-18.json',
                confirmText: '重命名',
                cancelText: '取消',
                validator: (val) => {
                    if (!val) return '文件名不能为空';
                    if (!val.toLowerCase().endsWith('.json')) return '文件名必须以 .json 结尾';
                    if (val === oldName) return '文件名未改变';
                    // 简单非法字符检查
                    if (/[\\/:*?"<>|]/.test(val)) return '文件名包含非法字符 \\ / : * ? " < > |';
                    return '';
                }
            });

            if (!newName) return; // 用户取消

            // 在APK环境中，OPFS重命名可能失败，使用copy+delete fallback
            const success = await FileVault.renameFile(oldName, newName);
            if (success) {
                NotificationsModule.showNotification('重命名成功', `文件已重命名为 ${newName}`);
                await loadVaultFileList();
            } else {
                // 如果直接重命名失败，尝试手动copy+delete fallback
                console.log('直接重命名失败，尝试copy+delete fallback...');
                
                // 读取原文件内容
                const content = await FileVault.readFile(oldName);
                if (!content) {
                    throw new Error('无法读取原文件内容');
                }
                
                // 保存为新文件
                const saved = await FileVault.saveJSON(newName, JSON.parse(content));
                if (!saved) {
                    throw new Error('保存新文件失败');
                }
                
                // 删除原文件
                const deleted = await FileVault.deleteFile(oldName);
                if (!deleted) {
                    console.warn('删除原文件失败，但新文件已创建');
                    NotificationsModule.showNotification('重命名部分成功', `新文件 ${newName} 已创建，但原文件 ${oldName} 删除失败，请手动删除`);
                } else {
                    NotificationsModule.showNotification('重命名成功', `文件已重命名为 ${newName}`);
                }
                
                await loadVaultFileList();
            }
        } catch (error) {
            console.error('重命名文件失败:', error);
            NotificationsModule.showNotification('重命名失败', `重命名操作失败: ${error.message}`);
        }
    };
    
    // 删除文件保险库文件（改为使用内置模态，兼容 APK/WebView）
    const deleteVaultFile = async (fileName) => {
        try {
            const confirmed = await openInlineConfirm({
                title: '删除文件',
                message: `确定要删除文件 "${fileName}" 吗？此操作无法撤销。`,
                confirmText: '确认删除',
                cancelText: '取消'
            });
            if (!confirmed) return;
            
            const success = await FileVault.deleteFile(fileName);
            if (success) {
                NotificationsModule.showNotification('删除成功', `文件 ${fileName} 已删除`);
                await loadVaultFileList();
            } else {
                // 在APK环境中，删除可能失败，给用户友好提示
                NotificationsModule.showNotification('删除失败', `由于环境限制，无法删除文件 ${fileName}。这在某些Android WebView环境中是正常现象。`);
                console.warn(`删除文件失败: ${fileName} - 可能是APK环境限制`);
            }
        } catch (error) {
            console.error('删除文件失败:', error);
            // 友好的错误消息，特别说明APK环境限制
            const errorMessage = error.message && (error.message.includes('NotAllowedError') || error.message.includes('remove')) 
                ? `无法删除文件 ${fileName}，这在Android WebView环境中是已知限制。` 
                : `删除操作失败: ${error.message}`;
            NotificationsModule.showNotification('删除失败', errorMessage);
        }
    };

    
    // 打开设置模态框
    const openSettingsModal = async () => {
        try {
            console.log('打开设置模态框');
            
            // 检查模态框元素是否存在
            const modalOverlay = document.getElementById('modal-overlay');
            const settingsModal = document.getElementById('settings-modal');
            
            if (!modalOverlay || !settingsModal) {
                throw new Error('找不到必要的模态框元素');
            }
            
            // 显示模态框
            modalOverlay.classList.remove('hidden');
            settingsModal.classList.remove('hidden');
            
            // 隐藏其他模态框
            document.querySelectorAll('.modal:not(#settings-modal)').forEach(function(modal) {
                modal.classList.add('hidden');
            });
            
            // 计算数据大小
            calculateDataSize();
            
            // 加载当前设置
            loadCurrentSettings();
            
            // 初始化FileVault并加载文件管理器
            await initializeVaultManager();
        } catch (error) {
            console.error('打开设置模态框失败:', error);
            throw error; // 重新抛出异常以便调用者处理
        }
    };
    
    
    // 加载当前设置
    const loadCurrentSettings = () => {
        // 获取全局设置
        const settings = StorageService.getSettings();
        
        // 获取今天的数据（用于打卡设置）
        const todayData = StorageService.getTodayData();
        
        // 设置早起打卡时间
        if (todayData.earlyWakeSettings) {
            document.getElementById('early-wake-start-time').value = todayData.earlyWakeSettings.startTime;
            document.getElementById('early-wake-end-time').value = todayData.earlyWakeSettings.endTime;
        }
        
        // 设置早睡打卡时间
        if (todayData.earlySleepSettings) {
            document.getElementById('early-sleep-start-time').value = todayData.earlySleepSettings.startTime;
            document.getElementById('early-sleep-end-time').value = todayData.earlySleepSettings.endTime;
        }
        
        // 开发者模式设置
        document.getElementById('dev-mode-toggle').checked = settings.devMode || false;
        toggleDevMode(settings.devMode || false);
        
        // 自动备份设置
        const autoBackupToggle = document.getElementById('auto-backup-toggle');
        if (autoBackupToggle) {
            autoBackupToggle.checked = settings.autoBackupEnabled !== false; // 默认启用
        }
    };
    
    // 保存设置
    const saveSettings = () => {
        try {
            // 获取打卡时间设置
            const earlyWakeStartTime = document.getElementById('early-wake-start-time').value;
            const earlyWakeEndTime = document.getElementById('early-wake-end-time').value;
            const earlySleepStartTime = document.getElementById('early-sleep-start-time').value;
            const earlySleepEndTime = document.getElementById('early-sleep-end-time').value;
            
            // 验证时间设置
            if (!earlyWakeStartTime || !earlyWakeEndTime || earlyWakeStartTime >= earlyWakeEndTime) {
                throw new Error('请设置有效的早起打卡时间范围');
            }
            
            if (!earlySleepStartTime || !earlySleepEndTime || earlySleepStartTime >= earlySleepEndTime) {
                throw new Error('请设置有效的早睡打卡时间范围');
            }
            
            // 更新今日数据
            const todayData = StorageService.getTodayData();
            todayData.earlyWakeSettings = {
                startTime: earlyWakeStartTime,
                endTime: earlyWakeEndTime
            };
            todayData.earlySleepSettings = {
                startTime: earlySleepStartTime,
                endTime: earlySleepEndTime
            };
            StorageService.updateTodayData(todayData);
            
            // 更新全局设置
            const devMode = document.getElementById('dev-mode-toggle').checked;
            StorageService.updateSettings({
                devMode: devMode
            });
            
            // 关闭模态框
            document.getElementById('modal-overlay').classList.add('hidden');
            document.getElementById('settings-modal').classList.add('hidden');
            
            // 显示通知
            NotificationsModule.showNotification('设置已保存', '应用设置已成功更新');
            
        } catch (error) {
            console.error('保存设置失败:', error);
            NotificationsModule.showNotification('保存失败', error.message);
        }
    };
    
    // 导出所有数据
    const exportAllData = async () => {
        try {
            // 获取所有数据
            const allData = {
                dailyData: StorageService.getAllData(),
                tasks: StorageService.getTaskTemplates(),
                customCategories: StorageService.getCustomCategories(),
                settings: StorageService.getSettings(),
                redbookEntries: JSON.parse(localStorage.getItem('bloom_redbook_entries')) || [],
                redbookSettings: JSON.parse(localStorage.getItem('bloom_redbook_settings')) || {}
            };
            
            // 生成文件名
            const fileName = `full_export_${StorageService.getTodayString()}.json`;
            
            // 尝试保存到FileVault
            const saved = await FileVault.saveJSON(fileName, allData);
            
            if (saved) {
                NotificationsModule.showNotification('导出成功', `数据已保存到文件夹: ${fileName}`);
                // 如果设置模态框是打开的，刷新文件列表
                if (!document.getElementById('settings-modal').classList.contains('hidden')) {
                    await loadVaultFileList();
                }
            } else {
                // 降级到直接下载（FileVault内部已处理）
                NotificationsModule.showNotification('导出完成', `文件已下载: ${fileName}`);
            }
            
        } catch (error) {
            console.error('导出所有数据失败:', error);
            NotificationsModule.showNotification('导出失败', `导出数据时出错: ${error.message}`);
        }
    };
    
    // 确认清除数据
    const confirmClearData = () => {
        // 创建确认对话框
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'modal';
        confirmDialog.innerHTML = `
            <div class="modal-header">
                <h3>确认清除数据</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="modal-body">
                <p>此操作将永久删除所有应用数据，包括任务记录、统计数据和设置。</p>
                <p>此操作无法撤销，请确认是否继续？</p>
                <div class="form-actions">
                    <button id="confirm-clear-data" class="danger-btn">确认清除</button>
                    <button id="cancel-clear-data" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        // 隐藏设置模态框
        document.getElementById('settings-modal').classList.add('hidden');
        
        // 显示确认对话框
        document.getElementById('modal-overlay').appendChild(confirmDialog);
        
        // 设置确认按钮事件
        document.getElementById('confirm-clear-data').addEventListener('click', () => {
            clearAllData();
            document.getElementById('modal-overlay').removeChild(confirmDialog);
            document.getElementById('modal-overlay').classList.add('hidden');
        });
        
        // 设置取消按钮事件
        document.getElementById('cancel-clear-data').addEventListener('click', () => {
            document.getElementById('modal-overlay').removeChild(confirmDialog);
            document.getElementById('settings-modal').classList.remove('hidden');
        });
        
        // 设置关闭按钮事件
        confirmDialog.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modal-overlay').removeChild(confirmDialog);
            document.getElementById('settings-modal').classList.remove('hidden');
        });
    };
    
    // 清除所有数据
    const clearAllData = async () => {
        try {
            // 1) 清除浏览器本地缓存数据（仅清除以 bloom_ 开头的键，不动 BloomData 文件夹中的文件）
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('bloom_')) {
                    localStorage.removeItem(key);
                }
            }
            // 兼容旧版本或其他存储位置（若存在同名 sessionStorage 键也清理）
            if (typeof sessionStorage !== 'undefined') {
                for (let i = sessionStorage.length - 1; i >= 0; i--) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith('bloom_')) {
                        sessionStorage.removeItem(key);
                    }
                }
            }

            // 2) 立即刷新内存与界面（避免用户在刷新前仍看到旧图表）
            // 重新初始化 StorageService（会重建“今日数据”的空壳结构）
            if (typeof StorageService !== 'undefined' && StorageService.initialize) {
                StorageService.initialize();
            }

            // 重置统计页面：优先显示“今日收入”饼图，并置空数据，隐藏其他图表
            try {
                const daily = document.getElementById('daily-chart');
                const period = document.getElementById('period-chart');
                const sleep = document.getElementById('sleep-chart');
                const wakeup = document.getElementById('wakeup-chart');

                if (daily) daily.style.display = 'block';
                if (period) period.style.display = 'none';
                if (sleep) sleep.style.display = 'none';
                if (wakeup) wakeup.style.display = 'none';

                if (typeof StatisticsModule !== 'undefined' && StatisticsModule.updateDailyChart) {
                    // 此时 StorageService 中已无历史数据，updateDailyChart 会渲染为 0 值
                    StatisticsModule.updateDailyChart();
                }
            } catch (e) {
                console.warn('重置统计图表失败（可忽略）:', e);
            }

            // 同步刷新首页总览数值
            if (typeof updateDailyOverview === 'function') {
                updateDailyOverview();
            }

            // 3) 通知并刷新页面，确保所有模块完全回到干净状态
            NotificationsModule.showNotification('数据已清除', '已清除应用缓存数据（不包含 BloomData 文件夹文件），页面即将刷新');

            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (error) {
            console.error('清除数据失败:', error);
            NotificationsModule.showNotification('清除失败', `清除数据时出错: ${error.message}`);
        }
    };
    
    // 切换开发者模式
    const toggleDevMode = (enabled) => {
        const devOptions = document.getElementById('dev-options');
        if (enabled) {
            devOptions.classList.remove('hidden');
        } else {
            devOptions.classList.add('hidden');
        }
    };
    
    // 添加测试数据
    const addTestData = () => {
        try {
            // 生成测试数据
            const now = new Date();
            const todayString = StorageService.getTodayString();
            
            // 获取所有现有数据
            const allData = StorageService.getAllData();
            
            // 生成过去7天的测试数据
            for (let i = 1; i <= 7; i++) {
                const testDate = new Date(now);
                testDate.setDate(now.getDate() - i);
                
                const testDateString = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
                
                // 检查该日期是否已有数据
                if (!allData.some(data => data.date === testDateString)) {
                    // 生成随机起床时间（5:00-8:00之间）
                    const wakeHour = 5 + Math.floor(Math.random() * 3);
                    const wakeMinute = Math.floor(Math.random() * 60);
                    const wakeupTime = new Date(testDate);
                    wakeupTime.setHours(wakeHour, wakeMinute, 0);
                    
                    // 生成随机睡眠时间（21:00-23:00之间）
                    const sleepHour = 21 + Math.floor(Math.random() * 2);
                    const sleepMinute = Math.floor(Math.random() * 60);
                    const sleepStartTime = new Date(testDate);
                    sleepStartTime.setHours(sleepHour, sleepMinute, 0);
                    
                    // 生成第二天的起床时间
                    const nextDay = new Date(testDate);
                    nextDay.setDate(testDate.getDate() + 1);
                    const sleepEndTime = new Date(nextDay);
                    sleepEndTime.setHours(wakeHour, wakeMinute, 0);
                    
                    // 计算睡眠时长
                    const sleepDuration = (sleepEndTime - sleepStartTime) / (1000 * 60);
                    
                    // 生成随机学习时长（0-3小时）
                    const studyHours = Math.random() * 3;
                    const studyMinutes = Math.round(studyHours * 60);
                    
                    // 构建测试数据对象
                    const testData = {
                        date: testDateString,
                        wakeupTime: wakeupTime.toISOString(),
                        sleepStartTime: sleepStartTime.toISOString(),
                        sleepEndTime: sleepEndTime.toISOString(),
                        sleepDuration: sleepDuration,
                        earlyWakeSettings: {
                            startTime: "05:00",
                            endTime: "06:00"
                        },
                        earlyWakeCheckedIn: wakeHour < 6,
                        earlySleepSettings: {
                            startTime: "22:00",
                            endTime: "23:00"
                        },
                        earlySleepCheckedIn: sleepHour < 23,
                        studySessions: [
                            {
                                id: `test-${Date.now()}-${i}`,
                                startTime: new Date(testDate).toISOString(),
                                endTime: new Date(testDate).toISOString(),
                                duration: studyMinutes,
                                completed: true,
                                earnings: (studyMinutes / 60) * 10
                            }
                        ],
                        completedTasks: [
                            {
                                id: `test-task-1-${i}`,
                                category: '身体健康',
                                name: '散步30分钟',
                                completed: true,
                                date: new Date(testDate).toISOString(),
                                earnings: 2
                            },
                            {
                                id: `test-task-2-${i}`,
                                category: '心理健康',
                                name: '冥想10分钟',
                                completed: true,
                                date: new Date(testDate).toISOString(),
                                earnings: 2
                            }
                        ],
                        totalEarnings: {
                            bodyHealth: (wakeHour < 6 ? 3 : 0) + (sleepHour < 23 ? 3 : 0) + 2,
                            mentalHealth: 2,
                            soulNourishment: 0,
                            selfImprovement: (studyMinutes / 60) * 10,
                            socialBonds: 0,
                            total: (wakeHour < 6 ? 3 : 0) + (sleepHour < 23 ? 3 : 0) + 4 + (studyMinutes / 60) * 10
                        }
                    };
                    
                    // 添加到所有数据中
                    allData.push(testData);
                }
            }
            
            // 保存更新后的数据
            localStorage.setItem(StorageService.KEYS.DAILY_DATA, JSON.stringify(allData));
            
            // 显示通知
            NotificationsModule.showNotification('测试数据已添加', '成功生成了过去7天的测试数据');
            
        } catch (error) {
            console.error('添加测试数据失败:', error);
            NotificationsModule.showNotification('添加测试数据失败', error.message);
        }
    };
    
    // 重置今日数据
    const resetTodayData = () => {
        try {
            // 获取所有数据
            const allData = StorageService.getAllData();
            const todayString = StorageService.getTodayString();
            
            // 找到并移除今日数据
            const index = allData.findIndex(data => data.date === todayString);
            if (index !== -1) {
                allData.splice(index, 1);
            }
            
            // 保存更新后的数据
            localStorage.setItem(StorageService.KEYS.DAILY_DATA, JSON.stringify(allData));
            
            // 重新初始化今日数据
            StorageService.getTodayData();
            
            // 显示通知
            NotificationsModule.showNotification('今日数据已重置', '所有今日数据已被清除，页面即将刷新');
            
            // 刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('重置今日数据失败:', error);
            NotificationsModule.showNotification('重置失败', `重置今日数据时出错: ${error.message}`);
        }
    };
    
    // 计算数据大小
    const calculateDataSize = () => {
        try {
            let totalSize = 0;
            
            // 计算localStorage中所有与应用相关的数据大小
            for(let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('bloom_')) {
                    const value = localStorage.getItem(key);
                    totalSize += key.length + value.length;
                }
            }
            
            // 转换为合适的单位
            let sizeDisplay;
            if (totalSize < 1024) {
                sizeDisplay = `${totalSize} 字节`;
            } else if (totalSize < 1024 * 1024) {
                sizeDisplay = `${(totalSize / 1024).toFixed(2)} KB`;
            } else {
                sizeDisplay = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
            }
            
            const dataSize = document.getElementById('data-size');
            if (dataSize) {
                dataSize.textContent = sizeDisplay;
            }
        } catch (error) {
            console.error('计算数据大小出错:', error);
            const dataSize = document.getElementById('data-size');
            if (dataSize) {
                dataSize.textContent = '计算失败';
            }
        }
    };
    
    // 处理文件导入
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // 验证文件类型
        if (!file.name.toLowerCase().endsWith('.json')) {
            NotificationsModule.showNotification('文件格式错误', '请选择JSON格式的文件');
            return;
        }
        
        // 验证文件大小 (限制为10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            NotificationsModule.showNotification('文件过大', '文件大小不能超过10MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const fileContent = e.target.result;
                importData(fileContent);
            } catch (error) {
                NotificationsModule.showNotification('读取文件失败', error.message);
            }
        };
        
        reader.onerror = function() {
            NotificationsModule.showNotification('读取文件失败', '无法读取选中的文件');
        };
        
        reader.readAsText(file);
        
        // 清空文件输入
        event.target.value = '';
    };
    
    // 导入数据功能
    const importData = (fileData) => {
        try {
            const importedData = JSON.parse(fileData);
            
            // 验证数据结构
            validateImportData(importedData);
            
            // 显示导入确认对话框
            showImportConfirmDialog(importedData);
            
        } catch (error) {
            console.error('导入数据失败:', error);
            NotificationsModule.showNotification('导入失败', `文件格式错误: ${error.message}`);
        }
    };
    
    // 数据验证
    const validateImportData = (data) => {
        const requiredFields = ['dailyData', 'tasks', 'customCategories', 'settings'];
        
        requiredFields.forEach(field => {
            if (!(field in data)) {
                throw new Error(`缺少必要字段: ${field}`);
            }
        });
        
        // 验证dailyData数组格式
        if (!Array.isArray(data.dailyData)) {
            throw new Error('dailyData必须是数组格式');
        }
        
        // 验证每个daily数据项的基本结构
        data.dailyData.forEach((dayData, index) => {
            if (!dayData.date) {
                throw new Error(`第${index + 1}条记录缺少日期字段`);
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dayData.date)) {
                throw new Error(`第${index + 1}条记录的日期格式不正确，应为YYYY-MM-DD`);
            }
        });
        
        // 验证tasks对象
        if (typeof data.tasks !== 'object' || data.tasks === null) {
            throw new Error('tasks必须是对象格式');
        }
        
        // 验证customCategories数组
        if (!Array.isArray(data.customCategories)) {
            throw new Error('customCategories必须是数组格式');
        }
        
        // 验证settings对象
        if (typeof data.settings !== 'object' || data.settings === null) {
            throw new Error('settings必须是对象格式');
        }
        
        // 验证红账本数据（可选字段，向后兼容）
        if (data.redbookEntries && !Array.isArray(data.redbookEntries)) {
            throw new Error('redbookEntries必须是数组格式');
        }
        
        if (data.redbookSettings && (typeof data.redbookSettings !== 'object' || data.redbookSettings === null)) {
            throw new Error('redbookSettings必须是对象格式');
        }
    };
    
    // 显示导入确认对话框
    const showImportConfirmDialog = (importedData) => {
        // 统计导入数据信息
        const dailyRecordsCount = importedData.dailyData.length;
        const categoriesCount = Object.keys(importedData.tasks).length;
        const customCategoriesCount = importedData.customCategories.length;
        const redbookEntriesCount = importedData.redbookEntries ? importedData.redbookEntries.length : 0;
        const hasRedbookSettings = importedData.redbookSettings ? 1 : 0;
        
        // 创建确认对话框
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'modal';
        confirmDialog.innerHTML = `
            <div class="modal-header">
                <h3>确认导入数据</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="modal-body">
                <div class="import-summary">
                    <h4>即将导入的数据:</h4>
                    <ul>
                        <li>每日记录: ${dailyRecordsCount} 条</li>
                        <li>任务类别: ${categoriesCount} 个</li>
                        <li>自定义类别: ${customCategoriesCount} 个</li>
                        <li>应用设置: 1 份</li>
                        ${redbookEntriesCount > 0 ? `<li>红账本记录: ${redbookEntriesCount} 条</li>` : ''}
                        ${hasRedbookSettings > 0 ? `<li>红账本设置: 1 份</li>` : ''}
                    </ul>
                </div>
                <div class="import-mode">
                    <h4>导入模式:</h4>
                    <label class="checkbox-label">
                        <input type="radio" name="import-mode" value="merge" checked>
                        <span>合并模式</span>
                    </label>
                    <p class="setting-desc">将新数据与现有数据合并，冲突时保留现有数据</p>
                    
                    <label class="checkbox-label">
                        <input type="radio" name="import-mode" value="replace">
                        <span>替换模式</span>
                    </label>
                    <p class="setting-desc">完全替换现有数据（建议先备份当前数据）</p>
                </div>
                <div class="form-actions">
                    <button id="confirm-import" class="primary-btn">确认导入</button>
                    <button id="cancel-import" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        // 隐藏设置模态框
        document.getElementById('settings-modal').classList.add('hidden');
        
        // 显示确认对话框
        document.getElementById('modal-overlay').appendChild(confirmDialog);
        
        // 设置确认按钮事件
        document.getElementById('confirm-import').addEventListener('click', () => {
            const mode = document.querySelector('input[name="import-mode"]:checked').value;
            performDataImport(importedData, mode);
            document.getElementById('modal-overlay').removeChild(confirmDialog);
            document.getElementById('modal-overlay').classList.add('hidden');
        });
        
        // 设置取消按钮事件
        document.getElementById('cancel-import').addEventListener('click', () => {
            document.getElementById('modal-overlay').removeChild(confirmDialog);
            document.getElementById('settings-modal').classList.remove('hidden');
        });
        
        // 设置关闭按钮事件
        confirmDialog.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modal-overlay').removeChild(confirmDialog);
            document.getElementById('settings-modal').classList.remove('hidden');
        });
    };
    
    // 执行数据导入
    const performDataImport = (importedData, mode) => {
        try {
            if (mode === 'replace') {
                // 替换模式：直接覆盖所有数据
                localStorage.setItem(StorageService.KEYS.DAILY_DATA, JSON.stringify(importedData.dailyData));
                localStorage.setItem(StorageService.KEYS.TASKS, JSON.stringify(importedData.tasks));
                localStorage.setItem(StorageService.KEYS.CUSTOM_CATEGORIES, JSON.stringify(importedData.customCategories));
                localStorage.setItem(StorageService.KEYS.SETTINGS, JSON.stringify(importedData.settings));
                
                // 导入红账本数据（如果存在）
                if (importedData.redbookEntries) {
                    localStorage.setItem('bloom_redbook_entries', JSON.stringify(importedData.redbookEntries));
                }
                if (importedData.redbookSettings) {
                    localStorage.setItem('bloom_redbook_settings', JSON.stringify(importedData.redbookSettings));
                }
            } else {
                // 合并模式：智能合并数据
                mergeImportData(importedData);
            }
            
            NotificationsModule.showNotification('导入成功', '数据已成功导入，页面即将刷新');
            
            // 刷新页面以应用新数据
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('执行数据导入失败:', error);
            NotificationsModule.showNotification('导入失败', `导入过程中出错: ${error.message}`);
        }
    };
    
    // 合并导入数据
    const mergeImportData = (importedData) => {
        // 合并每日数据
        const existingDailyData = StorageService.getAllData();
        const mergedDailyData = [...existingDailyData];
        
        importedData.dailyData.forEach(importDay => {
            const existingIndex = mergedDailyData.findIndex(day => day.date === importDay.date);
            if (existingIndex === -1) {
                // 新的日期，直接添加
                mergedDailyData.push(importDay);
            }
            // 如果日期已存在，保留现有数据（用户选择了合并模式）
        });
        
        // 合并任务模板
        const existingTasks = StorageService.getTaskTemplates();
        const mergedTasks = {...existingTasks};
        
        Object.keys(importedData.tasks).forEach(category => {
            if (!mergedTasks[category]) {
                mergedTasks[category] = importedData.tasks[category];
            } else {
                // 合并任务列表，去重
                const combinedTasks = [...mergedTasks[category], ...importedData.tasks[category]];
                mergedTasks[category] = [...new Set(combinedTasks)];
            }
        });
        
        // 合并自定义类别
        const existingCategories = StorageService.getCustomCategories();
        const mergedCategories = [...new Set([...existingCategories, ...importedData.customCategories])];
        
        // 合并设置（保留现有设置，只添加新字段）
        const existingSettings = StorageService.getSettings();
        const mergedSettings = {...importedData.settings, ...existingSettings};
        
        // 合并红账本数据（如果存在）
        let mergedRedbookEntries = JSON.parse(localStorage.getItem('bloom_redbook_entries')) || [];
        if (importedData.redbookEntries && Array.isArray(importedData.redbookEntries)) {
            // 合并红账本条目，按ID去重
            const existingEntryIds = new Set(mergedRedbookEntries.map(entry => entry.id));
            importedData.redbookEntries.forEach(entry => {
                if (!existingEntryIds.has(entry.id)) {
                    mergedRedbookEntries.push(entry);
                }
            });
        }
        
        let mergedRedbookSettings = JSON.parse(localStorage.getItem('bloom_redbook_settings')) || {};
        if (importedData.redbookSettings && typeof importedData.redbookSettings === 'object') {
            // 合并红账本设置，保留现有设置
            mergedRedbookSettings = {...importedData.redbookSettings, ...mergedRedbookSettings};
        }
        
        // 保存合并后的数据
        localStorage.setItem(StorageService.KEYS.DAILY_DATA, JSON.stringify(mergedDailyData));
        localStorage.setItem(StorageService.KEYS.TASKS, JSON.stringify(mergedTasks));
        localStorage.setItem(StorageService.KEYS.CUSTOM_CATEGORIES, JSON.stringify(mergedCategories));
        localStorage.setItem(StorageService.KEYS.SETTINGS, JSON.stringify(mergedSettings));
        localStorage.setItem('bloom_redbook_entries', JSON.stringify(mergedRedbookEntries));
        localStorage.setItem('bloom_redbook_settings', JSON.stringify(mergedRedbookSettings));
    };
    
    const resetTodaySleepRecord = () => {
        // 1) 清掉待结算入睡
        StorageService.clearPendingSleep();

        // 2) 清空“今天”的睡眠字段
        const all = StorageService.getAllData();
        const tStr = StorageService.getTodayString();
        const idx = all.findIndex(d => d.date === tStr);
        if (idx !== -1) {
            all[idx].sleepStartRef = null;
            all[idx].sleepEndRef = null;
            all[idx].sleepDuration = 0;
            // 旧字段一并清掉（防止历史 UI 误读）
            all[idx].sleepStartTime = null;
            all[idx].sleepEndTime = null;
            localStorage.setItem(StorageService.KEYS.DAILY_DATA, JSON.stringify(all));
        }

        // 3) 刷新首页卡片状态与统计
        try { window.checkTodaySleepStatus?.(); } catch(_) {}
        try { window.checkTodayWakeupStatus?.(); } catch(_) {}
        try { window.updateDailyOverview?.(); } catch(_) {}

        // 如果正显示统计页-睡眠图，也刷新
        try {
            const activeTab = document.querySelector('.chart-tab.active');
            const period = document.querySelector('.stat-period.active')?.dataset?.period || 'day';
            if (activeTab?.dataset.chart === 'sleep') StatisticsModule.updateSleepChart?.(period);
        } catch(_) {}

        NotificationsModule.showNotification('已重置', '今日睡眠记录与待结算入睡时间已清除');
    };

    // 公开API
    return {
        initialize,
        calculateDataSize,
        loadCurrentSettings,
        openSettingsModal,
        importVaultFile,
        renameVaultFile,
        deleteVaultFile
    };
})();