/**
 * 存储服务 - 管理本地数据存储
 */
const StorageService = (() => {
    // 存储键名
    const KEYS = {
        DAILY_DATA: 'bloom_daily_data',
        TASKS: 'bloom_tasks',
        CUSTOM_CATEGORIES: 'bloom_custom_categories',
        SETTINGS: 'bloom_settings'
    };

    // 初始化本地存储
    const initialize = () => {
        if (!localStorage.getItem(KEYS.DAILY_DATA)) {
            localStorage.setItem(KEYS.DAILY_DATA, JSON.stringify([]));
        }
        
        if (!localStorage.getItem(KEYS.TASKS)) {
            localStorage.setItem(KEYS.TASKS, JSON.stringify(getDefaultTasks()));
        }
        
        if (!localStorage.getItem(KEYS.CUSTOM_CATEGORIES)) {
            localStorage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify([]));
        }
        
        if (!localStorage.getItem(KEYS.SETTINGS)) {
            localStorage.setItem(KEYS.SETTINGS, JSON.stringify({
                darkMode: false,
                notificationsEnabled: true,
                autoBackupEnabled: true,
                lastBackupDate: null
            }));
        }
    };

    // 获取今日日期的格式化字符串 (YYYY-MM-DD)
    const getTodayString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    // 获取今天的数据，如果不存在则创建
    const getTodayData = () => {
        const allData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || [];
        const todayString = getTodayString();
        
        let todayData = allData.find(data => data.date === todayString);
        
        if (!todayData) {
            todayData = {
                date: todayString,
                wakeupTime: null,
                sleepStartTime: null, // 添加睡眠开始时间
                sleepEndTime: null,   // 添加睡眠结束时间
                sleepDuration: 0,     // 添加睡眠时长(分钟)
                studySessions: [],
                completedTasks: [],
                totalEarnings: {
                    bodyHealth: 0,
                    mentalHealth: 0,
                    soulNourishment: 0,
                    selfImprovement: 0,
                    socialBonds: 0,
                    total: 0
                }
            };
            
            allData.push(todayData);
            localStorage.setItem(KEYS.DAILY_DATA, JSON.stringify(allData));
        }
        
        return todayData;
    };

    // 更新今天的数据
    const updateTodayData = (newData) => {
        const allData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || [];
        const todayString = getTodayString();
        
        const index = allData.findIndex(data => data.date === todayString);
        
        if (index !== -1) {
            allData[index] = {...allData[index], ...newData};
        } else {
            allData.push({
                date: todayString,
                ...newData
            });
        }
        
        localStorage.setItem(KEYS.DAILY_DATA, JSON.stringify(allData));
        
        return allData[index >= 0 ? index : allData.length - 1];
    };

    // 获取所有历史数据
    const getAllData = () => {
        return JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || [];
    };

    // 获取默认任务列表
    const getDefaultTasks = () => {
        return {
            '身体健康': [
                '心肺功能锻炼20分钟',
                '做15分钟拉伸',
                '喝8杯水',
                '保持良好坐姿1小时',
                '户外活动30分钟',
                '黄帝内经实践'
            ],
            '心理健康': [
                '记录红账',
                '找回自主,做一点改变',
                '营造干净舒适的生活环境',
                '减少社交媒体使用时间',
                '享受独处时光'
            ],
            '灵魂滋养': [
                '正念冥想',
                '泡茶品茶',
                '欣赏艺术作品',
                '练习书法',
                '阅读经典',
                '发现美,欣赏美'
            ],
            '自我提升': [
                '读书,构建底层逻辑',
                '搜寻一手信息',
                '独立分析一个具体社会问题',
                '积累学习方法论',
                '做好计划'
            ],
            '广结善缘': [
                '偶尔帮忙或寻求帮助',
                '每天一次对话(打招呼,问候,汇报,聊近况)',
                '参与志愿活动',
                '一周两次礼物',
                '积累社交方法论'
            ]
        };
    };

    // 获取任务模板
    const getTaskTemplates = () => {
        return JSON.parse(localStorage.getItem(KEYS.TASKS)) || getDefaultTasks();
    };

    // 添加任务模板
    const addTaskTemplate = (category, taskName) => {
        const templates = getTaskTemplates();
        
        if (!templates[category]) {
            templates[category] = [];
        }
        
        if (!templates[category].includes(taskName)) {
            templates[category].push(taskName);
            localStorage.setItem(KEYS.TASKS, JSON.stringify(templates));
        }
        
        return templates;
    };

    // 获取自定义类别
    const getCustomCategories = () => {
        return JSON.parse(localStorage.getItem(KEYS.CUSTOM_CATEGORIES)) || [];
    };

    // 添加自定义类别
    const addCustomCategory = (categoryName) => {
        const categories = getCustomCategories();
        
        if (!categories.includes(categoryName)) {
            categories.push(categoryName);
            localStorage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
            
            // 同时在任务模板中添加该类别
            const templates = getTaskTemplates();
            templates[categoryName] = [];
            localStorage.setItem(KEYS.TASKS, JSON.stringify(templates));
        }
        
        return categories;
    };

    // 获取应用设置
    const getSettings = () => {
        return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {
            darkMode: false,
            notificationsEnabled: true,
            autoBackupEnabled: true,
            lastBackupDate: null
        };
    };

    // 更新应用设置
    const updateSettings = (newSettings) => {
        const settings = getSettings();
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify({
            ...settings,
            ...newSettings
        }));
        return {...settings, ...newSettings};
    };

    // 导出数据为CSV
    // 修改导出数据为CSV的函数
    const exportDataToCSV = () => {
        const allData = getAllData();
        
        // 扩展CSV表头，添加睡眠相关字段
        let csv = "日期,起床时间,睡眠开始时间,睡眠时长(分钟),睡眠时长(格式化),学习总时间(分钟),完成任务数,身体健康收入,心理健康收入,灵魂滋养收入,自我提升收入,广结善缘收入,总收入\n";
        
        // 添加数据行
        allData.forEach(day => {
            // 计算学习时间
            const studyMinutes = day.studySessions.reduce((total, session) => {
                return total + session.duration;
            }, 0);
            
            // 计算完成任务数
            const taskCount = day.completedTasks.length;
            
            // 格式化时间字段为人类可读格式
            const wakeupTime = day.wakeupTime ? formatDateTimeForHuman(new Date(day.wakeupTime)) : '';
            const sleepStartTime = day.sleepStartTime ? formatDateTimeForHuman(new Date(day.sleepStartTime)) : '';
            
            // 格式化睡眠时长
            let formattedSleepDuration = '';
            if (day.sleepDuration) {
                const hours = Math.floor(day.sleepDuration / 60);
                const minutes = Math.round(day.sleepDuration % 60);
                formattedSleepDuration = `${hours}小时${minutes}分钟`;
            }
            
            // 构建CSV行
            csv += `${day.date},${wakeupTime},${sleepStartTime},${day.sleepDuration || ''},${formattedSleepDuration},${studyMinutes},${taskCount},${day.totalEarnings.bodyHealth},${day.totalEarnings.mentalHealth},${day.totalEarnings.soulNourishment},${day.totalEarnings.selfImprovement},${day.totalEarnings.socialBonds},${day.totalEarnings.total}\n`;
        });
        
        // 添加 UTF-8 BOM
        const BOM = "\uFEFF";
        return BOM + csv;
    };

    // 添加辅助函数：格式化日期时间为人类可读格式
    const formatDateTimeForHuman = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date)) return '';
        
        // 格式化为 YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // 修改setupDataExport函数
    const setupDataExport = () => {
        document.getElementById('export-data').addEventListener('click', () => {
            // 生成CSV数据
            const csvData = StorageService.exportDataToCSV();
            
            // 创建下载链接
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // 设置下载属性
            link.setAttribute('href', url);
            link.setAttribute('download', `bloom_diary_export_${StorageService.getTodayString()}.csv`);
            link.style.visibility = 'hidden';
            
            // 添加到文档并模拟点击
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 显示通知
            NotificationsModule.showNotification('导出成功', '数据已成功导出为CSV文件');
        });
    };    

    // 公开API
    return {
        KEYS,  // 添加这一行！
        initialize,
        getTodayString,
        getTodayData,
        updateTodayData,
        getAllData,
        getTaskTemplates,
        addTaskTemplate,
        getCustomCategories,
        addCustomCategory,
        getSettings,
        updateSettings,
        exportDataToCSV,
        setupDataExport
    };
})();