const getStorageKey = (keyName) => {
    const keys = {
        DAILY_DATA: 'bloom_daily_data',
        TASKS: 'bloom_tasks',
        CUSTOM_CATEGORIES: 'bloom_custom_categories',
        SETTINGS: 'bloom_settings'
    };
    return keys[keyName];
};


const TasksModule = (() => {
    const DEFAULT_CATEGORIES = ['身体健康', '心理健康', '灵魂滋养', '自我提升', '广结善缘'];
    
    const CATEGORY_EARNING_MAPPING = {
        '身体健康': 'bodyHealth',
        '心理健康': 'mentalHealth',
        '灵魂滋养': 'soulNourishment',
        '自我提升': 'selfImprovement',
        '广结善缘': 'socialBonds'
    };
    
    const initialize = () => {
        console.log('初始化任务模块...');
        
        loadCategories();
        diagnoseAndFixCategoryIssues();
        loadTodayTasks();
        setupWakeupButton();
        setupSleepTracking();        
        setupAddTaskForm();
        setupAddCategoryForm();
        setupTimedCheckIn();        
        setupTabSwitching();
        ensureEventBindings();
        
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                loadTaskTemplates();
                document.getElementById('modal-overlay').classList.remove('hidden');
                document.getElementById('add-task-modal').classList.remove('hidden');
            });
        }
    };
    
    const ensureEventBindings = () => {
        console.log('确保任务模块事件绑定...');
        
        bindTabSwitchingEvents();
        bindAddTaskFormEvents();
        bindAddCategoryFormEvents();
    };
    
    const setupTabSwitching = () => {
        console.log('设置标签切换功能...');
        bindTabSwitchingEvents();
    };
    
    const bindTabSwitchingEvents = () => {
        console.log('绑定标签切换事件...');
        
        document.querySelectorAll('.tab-btn').forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const category = this.dataset.category;
                console.log('切换到任务类别:', category);
                
                if (category === 'custom') {
                    switchToCustomTab();
                } else {
                    switchTab(category);
                }
            });
        });
    };
    
    const bindAddTaskFormEvents = () => {
        console.log('绑定添加任务表单事件...');
        
        const addTaskForm = document.getElementById('add-task-form');
        if (addTaskForm) {
            // 记录当前选择的类别与任务名（由外部预选或用户选择）
            const prevCategoryEl = addTaskForm.querySelector('#task-category');
            const prevTaskNameEl = addTaskForm.querySelector('#task-name');
            const prevCategory = prevCategoryEl ? prevCategoryEl.value : null;
            const prevTaskName = prevTaskNameEl ? prevTaskNameEl.value : '';

            // 克隆并替换以清理旧事件
            const newForm = addTaskForm.cloneNode(true);
            addTaskForm.parentNode.replaceChild(newForm, addTaskForm);

            // 恢复之前的类别与任务名
            const restoredCategorySelect = newForm.querySelector('#task-category');
            const restoredTaskNameInput = newForm.querySelector('#task-name');

            if (restoredCategorySelect && prevCategory) {
                const hasOption = Array.from(restoredCategorySelect.options).some(opt => opt.value === prevCategory);
                if (!hasOption) {
                    const opt = document.createElement('option');
                    opt.value = prevCategory;
                    opt.textContent = prevCategory;
                    restoredCategorySelect.appendChild(opt);
                }
                restoredCategorySelect.value = prevCategory;
            }
            if (restoredTaskNameInput && prevTaskName) {
                restoredTaskNameInput.value = prevTaskName;
            }

            // 绑定提交事件
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('添加任务表单提交');
                
                const categorySelect = newForm.querySelector('#task-category');
                const taskNameInput = newForm.querySelector('#task-name');
                
                if (!categorySelect || !taskNameInput) {
                    console.error('找不到表单元素');
                    return;
                }
                
                const category = categorySelect.value;
                const taskName = taskNameInput.value.trim();
                
                if (!taskName) {
                    if (typeof NotificationsModule !== 'undefined') {
                        NotificationsModule.showNotification('添加失败', '请输入任务名称');
                    }
                    return;
                }
                
                console.log(`创建新任务: "${taskName}" (${category})`);
                
                try {
                    const task = {
                        id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        category: category,
                        name: taskName,
                        completed: false,
                        date: new Date().toISOString(),
                        earnings: 0
                    };
                    
                    StorageService.addTaskTemplate(category, taskName);
                    ensureCategoryExists(category);
                    addTaskToUI(task, false);
                    
                    document.getElementById('modal-overlay').classList.add('hidden');
                    document.getElementById('add-task-modal').classList.add('hidden');
                    
                    newForm.reset();
                    
                    setTimeout(() => {
                        switchTab(category);
                        bindTabSwitchingEvents();
                    }, 200);
                    
                    if (typeof NotificationsModule !== 'undefined') {
                        NotificationsModule.showNotification('任务添加成功', `已添加任务："${taskName}" 到 ${category} 类别`);
                    }
                    
                    console.log(`任务创建完成: "${taskName}" (${category})`);
                    
                } catch (error) {
                    console.error('添加任务失败:', error);
                    if (typeof NotificationsModule !== 'undefined') {
                        NotificationsModule.showNotification('添加失败', '添加任务时出错，请重试');
                    }
                }
            });
            
            const categorySelect = newForm.querySelector('#task-category');
            if (categorySelect) {
                categorySelect.addEventListener('change', loadTaskTemplates);
            }
            
            const addCategoryBtn = newForm.querySelector('#add-category-btn');
            if (addCategoryBtn) {
                console.log('绑定添加自定义类别按钮事件');
                
                const newAddCategoryBtn = addCategoryBtn.cloneNode(true);
                addCategoryBtn.parentNode.replaceChild(newAddCategoryBtn, addCategoryBtn);
                
                newAddCategoryBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('添加自定义类别按钮被点击');
                    
                    document.getElementById('add-task-modal').classList.add('hidden');
                    document.getElementById('add-category-modal').classList.remove('hidden');
                    
                    setTimeout(() => {
                        bindAddCategoryFormEvents();
                    }, 50);
                });
            }

            // 在克隆后根据恢复的类别刷新模板，防止又回到“身体健康”
            try {
                loadTaskTemplates();
            } catch (e) {
                console.warn('重新加载模板失败:', e);
            }
        }
    };

    const ensureBodyHealthStructure = () => {
        console.log('检查身体健康类别结构...');
        
        const healthTabContent = document.querySelector('.tab-content[data-category="身体健康"]');
        
        if (healthTabContent) {
            let tasksContainer = healthTabContent.querySelector('.tasks-list');
            
            if (!tasksContainer) {
                console.log('身体健康类别缺少任务列表容器，正在创建...');
                
                tasksContainer = document.createElement('div');
                tasksContainer.className = 'tasks-list';
                tasksContainer.id = 'tasks-身体健康';
                
                healthTabContent.appendChild(tasksContainer);
                
                console.log('身体健康任务列表容器创建完成');
            }
        } else {
            console.error('找不到身体健康的标签内容');
        }
    };    

    const bindAddCategoryFormEvents = () => {
        console.log('绑定添加类别表单事件...');
        
        const addCategoryForm = document.getElementById('add-category-form');
        if (addCategoryForm) {
            const newForm = addCategoryForm.cloneNode(true);
            addCategoryForm.parentNode.replaceChild(newForm, addCategoryForm);
            
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('添加类别表单提交');
                
                const categoryNameInput = newForm.querySelector('#category-name');
                if (!categoryNameInput) {
                    console.error('找不到类别名称输入框');
                    return;
                }
                
                const categoryName = categoryNameInput.value.trim();
                
                if (!categoryName) {
                    if (typeof NotificationsModule !== 'undefined') {
                        NotificationsModule.showNotification('添加失败', '请输入类别名称');
                    }
                    return;
                }
                
                console.log(`添加新类别: ${categoryName}`);
                
                try {
                    if (DEFAULT_CATEGORIES.includes(categoryName) || 
                        StorageService.getCustomCategories().includes(categoryName)) {
                        if (typeof NotificationsModule !== 'undefined') {
                            NotificationsModule.showNotification('添加失败', `类别"${categoryName}"已存在`);
                        }
                        return;
                    }
                    
                    StorageService.addCustomCategory(categoryName);
                    loadCategories();
                    addCategoryTab(categoryName);
                    
                    const categorySelect = document.getElementById('task-category');
                    if (categorySelect) {
                        const option = document.createElement('option');
                        option.value = categoryName;
                        option.textContent = categoryName;
                        categorySelect.appendChild(option);
                        categorySelect.value = categoryName;
                    }
                    
                    document.getElementById('add-category-modal').classList.add('hidden');
                    document.getElementById('add-task-modal').classList.remove('hidden');
                    
                    categoryNameInput.value = '';
                    
                    bindTabSwitchingEvents();
                    
                    if (typeof NotificationsModule !== 'undefined') {
                        NotificationsModule.showNotification('类别添加成功', `已添加类别："${categoryName}"`);
                    }
                    
                    console.log(`类别添加成功: ${categoryName}`);
                    
                } catch (error) {
                    console.error('添加类别失败:', error);
                    if (typeof NotificationsModule !== 'undefined') {
                        NotificationsModule.showNotification('添加失败', '添加类别时出错，请重试');
                    }
                }
            });
        }
    };
    
    const switchToCustomTab = () => {
        console.log('切换到自定义类别页面');
        
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const customTab = document.querySelector('.tab-btn[data-category="custom"]');
        if (customTab) {
            customTab.classList.add('active');
        }
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const customContent = document.querySelector('.tab-content[data-category="custom"]');
        if (customContent) {
            customContent.classList.add('active');
        }
    };
    
    const switchTab = (category) => {
        console.log(`尝试切换到标签: ${category}`);
        
        const allTabBtns = document.querySelectorAll('.tab-btn');
        const allTabContents = document.querySelectorAll('.tab-content');
        
        console.log(`找到 ${allTabBtns.length} 个标签按钮，${allTabContents.length} 个标签内容`);
        
        allTabBtns.forEach(tab => tab.classList.remove('active'));
        allTabContents.forEach(content => content.classList.remove('active'));
        
        const targetTabBtn = document.querySelector(`.tab-btn[data-category="${category}"]`);
        const targetTabContent = document.querySelector(`.tab-content[data-category="${category}"]`);
        
        console.log(`目标标签按钮:`, targetTabBtn);
        console.log(`目标标签内容:`, targetTabContent);
        
        if (!targetTabBtn) {
            console.error(`找不到类别为 ${category} 的标签按钮，尝试创建...`);
            ensureCategoryExists(category);
            
            const retryTabBtn = document.querySelector(`.tab-btn[data-category="${category}"]`);
            if (retryTabBtn) {
                retryTabBtn.classList.add('active');
            }
            return;
        }
        
        if (!targetTabContent) {
            console.error(`找不到类别为 ${category} 的标签内容，尝试创建...`);
            ensureCategoryExists(category);
            
            const retryTabContent = document.querySelector(`.tab-content[data-category="${category}"]`);
            if (retryTabContent) {
                retryTabContent.classList.add('active');
            }
            return;
        }
        
        targetTabBtn.classList.add('active');
        targetTabContent.classList.add('active');
        
        console.log(`标签切换成功: ${category}`);
        
        const tasksContainer = document.getElementById(`tasks-${category}`);
        if (tasksContainer) {
            const taskCount = tasksContainer.children.length;
            console.log(`${category} 类别当前有 ${taskCount} 个任务`);
        } else {
            console.warn(`${category} 类别缺少任务容器`);
        }
    };

    const confirmDeleteCategory = (category) => {
        console.log('显示删除确认对话框:', category);
        
        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'modal';
        confirmDialog.innerHTML = `
            <div class="modal-header">
                <h3>确认删除类别</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="modal-body">
                <p>确定要删除类别"${category}"吗？</p>
                <p>此操作将同时删除该类别下的所有任务模板，但不会删除已完成的任务记录。</p>
                <div class="form-actions">
                    <button id="confirm-delete-category" class="danger-btn">确认删除</button>
                    <button id="cancel-delete-category" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.classList.remove('hidden');
        modalOverlay.appendChild(confirmDialog);
        
        confirmDialog.querySelector('.close-modal').addEventListener('click', () => {
            modalOverlay.removeChild(confirmDialog);
            modalOverlay.classList.add('hidden');
        });
        
        document.getElementById('cancel-delete-category').addEventListener('click', () => {
            modalOverlay.removeChild(confirmDialog);
            modalOverlay.classList.add('hidden');
        });
        
        document.getElementById('confirm-delete-category').addEventListener('click', function() {
            console.log('确认删除类别:', category);
            
            try {
                deleteCategory(category);
                
                modalOverlay.removeChild(confirmDialog);
                modalOverlay.classList.add('hidden');
                
                NotificationsModule.showNotification('删除成功', `类别"${category}"已成功删除`);
                
                window.location.reload();
            } catch (error) {
                console.error('删除类别失败:', error);
                NotificationsModule.showNotification('删除失败', error.message);
            }
        });
    };

    const deleteCategory = (category) => {
        console.log('执行删除类别操作:', category);
        
        try {
            const customCategories = JSON.parse(localStorage.getItem(getStorageKey('CUSTOM_CATEGORIES'))) || [];
            const updatedCategories = customCategories.filter(cat => cat !== category);
            localStorage.setItem(getStorageKey('CUSTOM_CATEGORIES'), JSON.stringify(updatedCategories));
            
            const taskTemplates = JSON.parse(localStorage.getItem(getStorageKey('TASKS'))) || {};
            delete taskTemplates[category];
            localStorage.setItem(getStorageKey('TASKS'), JSON.stringify(taskTemplates));
            
            const tabBtn = document.querySelector(`.tab-btn[data-category="${category}"]`);
            const tabContent = document.querySelector(`.tab-content[data-category="${category}"]`);
            
            if (tabBtn) tabBtn.remove();
            if (tabContent) tabContent.remove();
            
            console.log('类别删除完成:', category);
            return true;
        } catch (error) {
            console.error('删除类别时出错:', error);
            throw new Error(`删除失败: ${error.message}`);
        }
    };

    const loadCategories = () => {
        const customCategories = StorageService.getCustomCategories();
        console.log('加载自定义类别:', customCategories);
        
        if (customCategories && customCategories.length > 0) {
            const customCategoriesContainer = document.getElementById('custom-categories');
            
            if (customCategoriesContainer) {
                customCategoriesContainer.innerHTML = '';
                
                customCategories.forEach(category => {
                    const categoryCard = document.createElement('div');
                    categoryCard.className = 'category-card';
                    categoryCard.style.position = 'relative';
                    categoryCard.style.paddingRight = '30px';
                    
                    categoryCard.innerHTML = `
                        <span>${category}</span>
                        <button class="delete-category-btn" 
                                data-category="${category}" 
                                title="删除类别 ${category}"
                                aria-label="删除自定义类别 ${category}"
                                style="...">
                            <i class="fas fa-trash" aria-hidden="true"></i>
                        </button>
                    `;
                    
                    categoryCard.addEventListener('click', (e) => {
                        if (e.target.closest('.delete-category-btn')) return;
                        
                        if (!document.querySelector(`.tab-btn[data-category="${category}"]`)) {
                            addCategoryTab(category);
                        }
                        switchTab(category);
                    });
                    
                    const deleteBtn = categoryCard.querySelector('.delete-category-btn');
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        confirmDeleteCategory(category);
                    });
                    
                    customCategoriesContainer.appendChild(categoryCard);
                });
            }
            
            customCategories.forEach(category => {
                if (!document.querySelector(`.tab-btn[data-category="${category}"]`)) {
                    addCategoryTab(category);
                }
            });
        }
    };
    

    const addCategoryTab = (category) => {
        console.log(`创建类别标签: ${category}`);
        
        if (document.querySelector(`.tab-btn[data-category="${category}"]`)) {
            console.log(`标签 ${category} 已存在`);
            return;
        }
        
        const tabsContainer = document.querySelector('.tabs');
        const customTabBtn = document.getElementById('custom-tab');
        
        if (!tabsContainer || !customTabBtn) {
            console.error('找不到标签容器或自定义标签按钮');
            return;
        }
        
        const newTabBtn = document.createElement('button');
        newTabBtn.className = 'tab-btn';
        newTabBtn.dataset.category = category;
        newTabBtn.textContent = category;
        
        tabsContainer.insertBefore(newTabBtn, customTabBtn);
        
        const tabContentsParent = document.querySelector('.card-body');
        
        if (!tabContentsParent) {
            console.error('找不到标签内容的父容器');
            return;
        }
        
        const newTabContent = document.createElement('div');
        newTabContent.className = 'tab-content';
        newTabContent.dataset.category = category;
        
        const tasksList = document.createElement('div');
        tasksList.className = 'tasks-list';
        tasksList.id = `tasks-${category}`;
        newTabContent.appendChild(tasksList);
        
        tabContentsParent.appendChild(newTabContent);
        
        console.log(`类别标签创建成功: ${category}`);
        
        bindTabSwitchingEvents();
    };
    

    const loadTodayTasks = () => {
        console.log('加载今日任务...');
        
        const todayData = StorageService.getTodayData();
        const completedTasks = todayData.completedTasks || [];
        
        if (todayData.wakeupTime) {
            console.log('今日已进行起床打卡');
        }
        
        DEFAULT_CATEGORIES.forEach(category => {
            const tasksContainer = document.getElementById(`tasks-${category}`);
            if (tasksContainer) {
                tasksContainer.innerHTML = '';
            }
        });
        
        const customCategories = StorageService.getCustomCategories();
        customCategories.forEach(category => {
            const tasksContainer = document.getElementById(`tasks-${category}`);
            if (tasksContainer) {
                tasksContainer.innerHTML = '';
            } else {
                console.log(`为自定义类别 "${category}" 创建任务容器`);
                addCategoryTab(category);
            }
        });
        
        completedTasks.forEach(task => {
            console.log(`显示已完成任务: "${task.name}" (${task.category})`);
            
            if (!DEFAULT_CATEGORIES.includes(task.category) && !customCategories.includes(task.category)) {
                console.log(`任务的类别 "${task.category}" 不存在，添加为自定义类别`);
                StorageService.addCustomCategory(task.category);
                addCategoryTab(task.category);
            }
            
            addTaskToUI(task, true);
        });
        
        console.log(`今日任务加载完成，共 ${completedTasks.length} 个已完成任务`);
    };
    
    const setupWakeupButton = () => {
        const wakeupBtn = document.getElementById('wakeup-btn');
        
        wakeupBtn.addEventListener('click', () => {
            const now = new Date();
            const wakeupTime = now.toISOString();
            
            const todayData = StorageService.getTodayData();
            todayData.wakeupTime = wakeupTime;
            
            const wakeupTask = {
                id: `wakeup-${Date.now()}`,
                category: '身体健康',
                name: '起床打卡',
                completed: true,
                date: wakeupTime,
                earnings: 2
            };
            
            todayData.completedTasks.push(wakeupTask);
            
            todayData.totalEarnings.bodyHealth += 2;
            todayData.totalEarnings.total += 2;
            
            StorageService.updateTodayData(todayData);
            
            wakeupBtn.disabled = true;
            
            const wakeupTimeValue = document.getElementById('wakeup-time-value');
            wakeupTimeValue.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            document.getElementById('wakeup-time').style.display = 'block';
            
            NotificationsModule.showNotification('起床打卡成功', '获得2元奖励！新的一天，充满希望！');
            
            updateDailyOverview();
        });
    };

    const setupSleepTracking = () => {
        const sleepBtn = document.getElementById('sleep-btn');
        const sleepStatus = document.getElementById('sleep-status');
        const sleepTimeDisplay = document.getElementById('sleep-time-display');
        
        if (!sleepBtn) {
            console.warn('Sleep check-in elements not found, skipping setup');
            return;
        }
        
        const loadSleepStatus = () => {
            const todayData = StorageService.getTodayData();
            
            const hasSleepTask = todayData.completedTasks && todayData.completedTasks.some(task => 
                task.name && task.name.includes('睡眠') || task.name === '睡觉打卡'
            );
            
            if (hasSleepTask) {
                if (sleepBtn) {
                    sleepBtn.textContent = '已打卡';
                    sleepBtn.disabled = true;
                    sleepBtn.classList.remove('primary-btn');
                    sleepBtn.classList.add('secondary-btn');
                }
                
                if (sleepStatus) {
                    sleepStatus.textContent = '已完成';
                    sleepStatus.classList.add('completed');
                }
                
                if (sleepTimeDisplay) {
                    const sleepTask = todayData.completedTasks.find(task => 
                        task.name && (task.name.includes('睡眠') || task.name === '睡觉打卡')
                    );
                    if (sleepTask) {
                        const sleepTime = new Date(sleepTask.date);
                        sleepTimeDisplay.textContent = `打卡时间：${sleepTime.toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}`;
                        sleepTimeDisplay.classList.remove('hidden');
                    }
                }
            }
        };
        
        sleepBtn.addEventListener('click', () => {
            const now = new Date();
            const todayData = StorageService.getTodayData();
            
            const hasSleepTask = todayData.completedTasks && todayData.completedTasks.some(task => 
                task.name && (task.name.includes('睡眠') || task.name === '睡觉打卡')
            );
            
            if (hasSleepTask) {
                if (typeof NotificationsModule !== 'undefined') {
                    NotificationsModule.showNotification('重复打卡', '今天已经完成睡觉打卡了！');
                }
                return;
            }
            
            const sleepTask = {
                id: `sleep-${Date.now()}`,
                category: '身体健康',
                name: '睡觉打卡',
                completed: true,
                date: now.toISOString(),
                earnings: 2
            };
            
            todayData.completedTasks.push(sleepTask);
            
            todayData.totalEarnings.bodyHealth += 2;
            todayData.totalEarnings.total += 2;
            
            StorageService.updateTodayData(todayData);
            
            sleepBtn.textContent = '已打卡';
            sleepBtn.disabled = true;
            sleepBtn.classList.remove('primary-btn');
            sleepBtn.classList.add('secondary-btn');
            
            if (sleepStatus) {
                sleepStatus.textContent = '已完成';
                sleepStatus.classList.add('completed');
            }
            
            if (sleepTimeDisplay) {
                sleepTimeDisplay.textContent = `打卡时间：${now.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
                sleepTimeDisplay.classList.remove('hidden');
            }
            
            if (typeof NotificationsModule !== 'undefined') {
                NotificationsModule.showNotification('睡觉打卡成功', '晚安！获得2元奖励！');
            }
            
            if (typeof updateDailyOverview === 'function') {
                updateDailyOverview();
            }
        });
        
        loadSleepStatus();
    };

    const loadTaskTemplates = () => {
        const templatesContainer = document.getElementById('task-templates');
        templatesContainer.innerHTML = '';
        
        const category = document.getElementById('task-category').value;
        const templates = StorageService.getTaskTemplates()[category] || [];
        
        templates.forEach(template => {
            const templateTag = document.createElement('span');
            templateTag.className = 'template-tag';
            templateTag.textContent = template;
            templateTag.addEventListener('click', () => {
                document.getElementById('task-name').value = template;
            });
            
            templatesContainer.appendChild(templateTag);
        });
    };
    
    const setupAddTaskForm = () => {
        const form = document.getElementById('add-task-form');
        const categorySelect = document.getElementById('task-category');
        
        categorySelect.addEventListener('change', loadTaskTemplates);
        
        const updateCategoryOptions = () => {
            console.log('更新任务类别选项');
            
            const selectedValue = categorySelect.value;
            
            categorySelect.innerHTML = '';
            
            DEFAULT_CATEGORIES.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            const customCategories = StorageService.getCustomCategories();
            console.log('自定义类别:', customCategories);
            
            customCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            if (selectedValue && Array.from(categorySelect.options).some(opt => opt.value === selectedValue)) {
                categorySelect.value = selectedValue;
            }
        };
        
        updateCategoryOptions();
        
        const addCategoryBtn = document.getElementById('add-category-btn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => {
                document.getElementById('add-task-modal').classList.add('hidden');
                document.getElementById('add-category-modal').classList.remove('hidden');
            });
        } else {
            console.warn('add-category-btn element not found');
        }
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const category = categorySelect.value;
            const taskName = document.getElementById('task-name').value.trim();
            
            if (!taskName) return;
            
            console.log(`创建新任务: "${taskName}" (${category})`);
            
            const task = {
                id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                category: category,
                name: taskName,
                completed: false,
                date: new Date().toISOString(),
                earnings: 0
            };
            
            StorageService.addTaskTemplate(category, taskName);
            
            if (!document.querySelector(`.tab-btn[data-category="${category}"]`)) {
                console.log(`为 ${category} 创建新标签`);
                addCategoryTab(category);
            }
            
            addTaskToUI(task, false);
            
            switchTab(category);
            
            document.getElementById('modal-overlay').classList.add('hidden');
            document.getElementById('add-task-modal').classList.add('hidden');
            
            form.reset();
            
            console.log(`任务创建完成: "${taskName}" (${category})`);
        });
    };


    const setupAddCategoryForm = () => {
        const form = document.getElementById('add-category-form');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const categoryName = document.getElementById('category-name').value.trim();
            
            if (!categoryName) return;
            
            console.log(`添加新类别: ${categoryName}`);
            
            if (DEFAULT_CATEGORIES.includes(categoryName) || 
                StorageService.getCustomCategories().includes(categoryName)) {
                NotificationsModule.showNotification('添加失败', `类别"${categoryName}"已存在`);
                return;
            }
            
            StorageService.addCustomCategory(categoryName);
            
            loadCategories();
            
            addCategoryTab(categoryName);
            
            const categorySelect = document.getElementById('task-category');
            const option = document.createElement('option');
            option.value = categoryName;
            option.textContent = categoryName;
            categorySelect.appendChild(option);
            categorySelect.value = categoryName;
            
            switchTab(categoryName);
            
            document.getElementById('add-category-modal').classList.add('hidden');
            document.getElementById('add-task-modal').classList.remove('hidden');
            
            document.getElementById('category-name').value = '';
            
            console.log(`类别添加成功: ${categoryName}`);
        });
    };
    
    const ensureCategoryExists = (category) => {
        console.log(`检查类别完整性: ${category}`);
        
        if (DEFAULT_CATEGORIES.includes(category)) {
            return;
        }
        
        let tabBtn = document.querySelector(`.tab-btn[data-category="${category}"]`);
        if (!tabBtn) {
            console.log(`类别 ${category} 缺少标签按钮，创建中...`);
            addCategoryTab(category);
            tabBtn = document.querySelector(`.tab-btn[data-category="${category}"]`);
        }
        
        let tabContent = document.querySelector(`.tab-content[data-category="${category}"]`);
        if (!tabContent) {
            console.log(`类别 ${category} 缺少标签内容，创建中...`);
            addCategoryTab(category);
            tabContent = document.querySelector(`.tab-content[data-category="${category}"]`);
        }
        
        let tasksContainer = document.getElementById(`tasks-${category}`);
        if (!tasksContainer) {
            console.log(`类别 ${category} 缺少任务容器，创建中...`);
            
            if (tabContent) {
                tasksContainer = document.createElement('div');
                tasksContainer.className = 'tasks-list';
                tasksContainer.id = `tasks-${category}`;
                tabContent.appendChild(tasksContainer);
            }
        }
        
        bindTabSwitchingEvents();
        
        console.log(`类别 ${category} 完整性检查完成`);
    };

    const addTaskToUI = (task, isCompleted) => {
        console.log(`开始添加任务到UI: "${task.name}" (${task.category})`);
        
        ensureCategoryExists(task.category);
        
        let tasksContainer = document.getElementById(`tasks-${task.category}`);
        
        if (!tasksContainer) {
            console.error(`找不到类别 ${task.category} 的任务容器，强制创建...`);
            
            if (!DEFAULT_CATEGORIES.includes(task.category)) {
                addCategoryTab(task.category);
                tasksContainer = document.getElementById(`tasks-${task.category}`);
            }
            
            if (!tasksContainer) {
                console.error(`无法创建 ${task.category} 的任务容器`);
                return;
            }
        }
        
        if (document.querySelector(`.task-item[data-id="${task.id}"]`)) {
            console.log(`任务 ${task.id} 已存在，跳过添加`);
            return;
        }
        
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${isCompleted ? 'completed' : ''}`;
        taskElement.dataset.id = task.id;
        
        taskElement.innerHTML = `
            <span>${task.name}</span>
            <div class="task-check">
                <i class="fas fa-check"></i>
            </div>
        `;
        
        if (!isCompleted) {
            const checkBtn = taskElement.querySelector('.task-check');
            checkBtn.addEventListener('click', function() {
                completeTask(task, taskElement);
            });
        }
        
        tasksContainer.appendChild(taskElement);
        console.log(`成功添加任务 "${task.name}" 到 ${task.category} 类别`);
        
        if (!isCompleted) {
            setTimeout(() => {
                switchTab(task.category);
            }, 100);
        }
        
        if (typeof updateDailyOverview === 'function') {
            updateDailyOverview();
        }
    };

    const setupTimedCheckIn = () => {
        console.log('Timed check-in setup completed - using existing check-in cards');
        
        loadTimedCheckInSettings();
        setupTimedCheckInButtons();
    };

    const loadTimedCheckInSettings = () => {
        const earlyWakeInfo = document.getElementById('early-wake-info');
        if (!earlyWakeInfo) {
            console.log('Timed check-in elements not found, using existing check-in cards');
            return;
        }
        
        const todayData = StorageService.getTodayData();
        
        if (todayData.earlyWakeSettings) {
            document.getElementById('early-wake-start').value = todayData.earlyWakeSettings.startTime;
            document.getElementById('early-wake-end').value = todayData.earlyWakeSettings.endTime;
            
            const earlyWakeInfo = document.getElementById('early-wake-info');
            earlyWakeInfo.innerHTML = `<p>在${todayData.earlyWakeSettings.startTime}-${todayData.earlyWakeSettings.endTime}之间打卡有效，可获得3元奖励</p>`;
            
            if (todayData.earlyWakeCheckedIn) {
                document.getElementById('early-wake-status').textContent = '已完成';
                document.getElementById('early-wake-status').classList.add('completed');
                document.getElementById('early-wake-checkin').disabled = true;
            }
        }
        
        if (todayData.earlySleepSettings) {
            document.getElementById('early-sleep-start').value = todayData.earlySleepSettings.startTime;
            document.getElementById('early-sleep-end').value = todayData.earlySleepSettings.endTime;
            
            const earlySleepInfo = document.getElementById('early-sleep-info');
            earlySleepInfo.innerHTML = `<p>在${todayData.earlySleepSettings.startTime}-${todayData.earlySleepSettings.endTime}之间打卡有效，可获得3元奖励</p>`;
            
            if (todayData.earlySleepCheckedIn) {
                document.getElementById('early-sleep-status').textContent = '已完成';
                document.getElementById('early-sleep-status').classList.add('completed');
                document.getElementById('early-sleep-checkin').disabled = true;
            }
        }
    };

    const setupTimedCheckInButtons = () => {
        const saveEarlyWake = document.getElementById('save-early-wake');
        if (!saveEarlyWake) {
            console.log('Timed check-in buttons not found, skipping setup');
            return;
        }
        
        document.getElementById('save-early-wake').addEventListener('click', () => {
            const startTime = document.getElementById('early-wake-start').value;
            const endTime = document.getElementById('early-wake-end').value;
            
            if (!startTime || !endTime || startTime >= endTime) {
                NotificationsModule.showNotification('设置失败', '请设置有效的时间范围');
                return;
            }
            
            const todayData = StorageService.getTodayData();
            todayData.earlyWakeSettings = {
                startTime: startTime,
                endTime: endTime
            };
            StorageService.updateTodayData(todayData);
            
            const earlyWakeInfo = document.getElementById('early-wake-info');
            earlyWakeInfo.innerHTML = `<p>在${startTime}-${endTime}之间打卡有效，可获得3元奖励</p>`;
            
            NotificationsModule.showNotification('设置成功', `早起打卡时间已设为${startTime}-${endTime}`);
        });
        
        document.getElementById('save-early-sleep').addEventListener('click', () => {
            const startTime = document.getElementById('early-sleep-start').value;
            const endTime = document.getElementById('early-sleep-end').value;
            
            if (!startTime || !endTime || startTime >= endTime) {
                NotificationsModule.showNotification('设置失败', '请设置有效的时间范围');
                return;
            }
            
            const todayData = StorageService.getTodayData();
            todayData.earlySleepSettings = {
                startTime: startTime,
                endTime: endTime
            };
            StorageService.updateTodayData(todayData);
            
            const earlySleepInfo = document.getElementById('early-sleep-info');
            earlySleepInfo.innerHTML = `<p>在${startTime}-${endTime}之间打卡有效，可获得3元奖励</p>`;
            
            NotificationsModule.showNotification('设置成功', `早睡打卡时间已设为${startTime}-${endTime}`);
        });
        
        document.getElementById('early-wake-checkin').addEventListener('click', () => {
            const todayData = StorageService.getTodayData();
            
            if (!todayData.earlyWakeSettings) {
                NotificationsModule.showNotification('打卡失败', '请先设置打卡时间范围');
                return;
            }
            
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (currentTime >= todayData.earlyWakeSettings.startTime && currentTime <= todayData.earlyWakeSettings.endTime) {
                todayData.earlyWakeCheckedIn = true;
                
                const earlyWakeTask = {
                    id: `early-wake-${Date.now()}`,
                    category: '身体健康',
                    name: '早起打卡成功',
                    completed: true,
                    date: now.toISOString(),
                    earnings: 3
                };
                
                todayData.completedTasks.push(earlyWakeTask);
                
                todayData.totalEarnings.bodyHealth += 3;
                todayData.totalEarnings.total += 3;
                
                StorageService.updateTodayData(todayData);
                
                document.getElementById('early-wake-status').textContent = '已完成';
                document.getElementById('early-wake-status').classList.add('completed');
                document.getElementById('early-wake-checkin').disabled = true;
                
                NotificationsModule.showNotification('早起打卡成功', '恭喜你成功早起！获得3元奖励');
                
                updateDailyOverview();
            } else {
                NotificationsModule.showNotification('打卡失败', `当前不在有效打卡时间内(${todayData.earlyWakeSettings.startTime}-${todayData.earlyWakeSettings.endTime})`);
            }
        });
        
        document.getElementById('early-sleep-checkin').addEventListener('click', () => {
            const todayData = StorageService.getTodayData();
            
            if (!todayData.earlySleepSettings) {
                NotificationsModule.showNotification('打卡失败', '请先设置打卡时间范围');
                return;
            }
            
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (currentTime >= todayData.earlySleepSettings.startTime && currentTime <= todayData.earlySleepSettings.endTime) {
                todayData.earlySleepCheckedIn = true;
                
                const earlySleepTask = {
                    id: `early-sleep-${Date.now()}`,
                    category: '身体健康',
                    name: '早睡打卡成功',
                    completed: true,
                    date: now.toISOString(),
                    earnings: 3
                };
                
                todayData.completedTasks.push(earlySleepTask);
                
                todayData.totalEarnings.bodyHealth += 3;
                todayData.totalEarnings.total += 3;
                
                StorageService.updateTodayData(todayData);
                
                document.getElementById('early-sleep-status').textContent = '已完成';
                document.getElementById('early-sleep-status').classList.add('completed');
                document.getElementById('early-sleep-checkin').disabled = true;
                
                NotificationsModule.showNotification('早睡打卡成功', '恭喜你今天早睡！获得3元奖励');
                
                updateDailyOverview();
            } else {
                NotificationsModule.showNotification('打卡失败', `当前不在有效打卡时间内(${todayData.earlySleepSettings.startTime}-${todayData.earlySleepSettings.endTime})`);
            }
        });
    };    
    const completeTask = (task, taskElement) => {
        if (taskElement.classList.contains('completed')) {
            return;
        }
        
        taskElement.classList.add('completed');
        
        task.completed = true;
        task.date = new Date().toISOString();
        task.earnings = 2;
        
        const todayData = StorageService.getTodayData();
        
        const existingTaskIndex = todayData.completedTasks.findIndex(t => t.id === task.id);
        if (existingTaskIndex === -1) {
            todayData.completedTasks.push(task);
            
            const earningField = CATEGORY_EARNING_MAPPING[task.category] || 'selfImprovement';
            todayData.totalEarnings[earningField] += task.earnings;
            todayData.totalEarnings.total += task.earnings;
            
            StorageService.updateTodayData(todayData);
            
            NotificationsModule.showNotification('任务完成', `完成"${task.name}"，获得2元奖励！`);
        }
        
        updateDailyOverview();
        
        const checkBtn = taskElement.querySelector('.task-check');
        checkBtn.removeEventListener('click', () => completeTask(task, taskElement));
        checkBtn.style.pointerEvents = 'none';
    };
    
    const diagnoseAndFixCategoryIssues = () => {
        console.log('开始诊断类别问题...');
        
        ensureBodyHealthStructure();
        
        const customCategories = StorageService.getCustomCategories();
        console.log(`发现 ${customCategories.length} 个自定义类别`);
        
        customCategories.forEach(category => {
            const tabBtn = document.querySelector(`.tab-btn[data-category="${category}"]`);
            if (!tabBtn) {
                console.log(`类别 "${category}" 缺少标签按钮，正在修复...`);
                addCategoryTab(category);
            }
            
            const tabContent = document.querySelector(`.tab-content[data-category="${category}"]`);
            if (!tabContent) {
                console.log(`类别 "${category}" 缺少内容区域，正在修复...`);
            }
            
            const tasksList = document.getElementById(`tasks-${category}`);
            if (!tasksList) {
                console.log(`类别 "${category}" 缺少任务列表容器，正在修复...`);
                
                if (tabContent) {
                    const newTasksList = document.createElement('div');
                    newTasksList.className = 'tasks-list';
                    newTasksList.id = `tasks-${category}`;
                    tabContent.appendChild(newTasksList);
                }
            }
        });
        
        const todayData = StorageService.getTodayData();
        const allTasks = todayData.completedTasks;
        const missingCategories = new Set();
        
        allTasks.forEach(task => {
            if (!DEFAULT_CATEGORIES.includes(task.category) && !customCategories.includes(task.category)) {
                console.log(`发现任务使用了不存在的类别: "${task.category}"`);
                missingCategories.add(task.category);
            }
        });
        
        missingCategories.forEach(category => {
            console.log(`添加缺失的类别: "${category}"`);
            StorageService.addCustomCategory(category);
            addCategoryTab(category);
        });
        
        console.log('类别诊断和修复完成');
    };


    // 公开API
    return {
        initialize,
        loadTodayTasks,
        loadTaskTemplates, // 添加此方法到公开API
        ensureEventBindings // 添加此方法到公开API
    };
})();