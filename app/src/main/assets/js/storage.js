/**
 * 存储服务 - 管理本地数据存储
 */
const StorageService = (() => {
    // 存储键名
    const KEYS = {
        DAILY_DATA: 'bloom_daily_data',
        TASKS: 'bloom_tasks',
        CUSTOM_CATEGORIES: 'bloom_custom_categories',
        SETTINGS: 'bloom_settings',
        PENDING_SLEEP: 'bloom_pending_sleep' // 新增：待结算入睡
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
        // pending 不强制创建，按需写入
    };

    const getTodayString = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    const getTodayData = () => {
        const allData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || [];
        const todayString = getTodayString();
        let todayData = allData.find(data => data.date === todayString);
        if (!todayData) {
            todayData = {
                date: todayString,
                wakeupTime: null,
                sleepStartRef: null, // 新：归属起床日
                sleepEndRef: null,   // 新：归属起床日
                sleepStartTime: null, // 旧字段保留
                sleepEndTime: null,   // 旧字段保留
                sleepDuration: 0,     // 分钟
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

    const updateTodayData = (newData) => {
        const allData = JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || [];
        const todayString = getTodayString();
        const index = allData.findIndex(data => data.date === todayString);
        if (index !== -1) {
            allData[index] = {...allData[index], ...newData};
        } else {
            allData.push({ date: todayString, ...newData });
        }
        localStorage.setItem(KEYS.DAILY_DATA, JSON.stringify(allData));
        return allData[index >= 0 ? index : allData.length - 1];
    };

    const getAllData = () => {
        return JSON.parse(localStorage.getItem(KEYS.DAILY_DATA)) || [];
    };

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

    const getTaskTemplates = () => JSON.parse(localStorage.getItem(KEYS.TASKS)) || getDefaultTasks();
    const addTaskTemplate = (category, taskName) => {
        const templates = getTaskTemplates();
        if (!templates[category]) templates[category] = [];
        if (!templates[category].includes(taskName)) {
            templates[category].push(taskName);
            localStorage.setItem(KEYS.TASKS, JSON.stringify(templates));
        }
        return templates;
    };

    const getCustomCategories = () => JSON.parse(localStorage.getItem(KEYS.CUSTOM_CATEGORIES)) || [];
    const addCustomCategory = (categoryName) => {
        const categories = getCustomCategories();
        if (!categories.includes(categoryName)) {
            categories.push(categoryName);
            localStorage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
            const templates = getTaskTemplates();
            templates[categoryName] = [];
            localStorage.setItem(KEYS.TASKS, JSON.stringify(templates));
        }
        return categories;
    };

    const getSettings = () => JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {
        darkMode: false,
        notificationsEnabled: true,
        autoBackupEnabled: true,
        lastBackupDate: null
    };
    const updateSettings = (newSettings) => {
        const settings = getSettings();
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...settings, ...newSettings }));
        return { ...settings, ...newSettings };
    };

    // 新增：pending sleep 的读写
    const getPendingSleep = () => {
        try {
            const raw = localStorage.getItem(KEYS.PENDING_SLEEP);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (obj && obj.startRef) return obj;
        } catch (_) {}
        return null;
    };
    const setPendingSleep = (startISO) => {
        localStorage.setItem(KEYS.PENDING_SLEEP, JSON.stringify({ startRef: startISO }));
    };
    const clearPendingSleep = () => {
        localStorage.removeItem(KEYS.PENDING_SLEEP);
    };

    // 导出数据为CSV（新增两列 sleepStartRef, sleepEndRef）
    const exportDataToCSV = () => {
        const allData = getAllData();
        let csv = "日期,起床时间,睡眠开始时间(旧),睡眠时长(分钟),睡眠时长(格式化),入睡引用时间(sleepStartRef),起床时间(sleepEndRef),学习总时间(分钟),完成任务数,身体健康收入,心理健康收入,灵魂滋养收入,自我提升收入,广结善缘收入,总收入\n";
        allData.forEach(day => {
            const studyMinutes = day.studySessions?.reduce((t, s) => t + (s.duration || 0), 0) || 0;
            const taskCount = day.completedTasks?.length || 0;

            const wakeupTime = day.wakeupTime ? formatDateTimeForHuman(new Date(day.wakeupTime)) : '';
            const sleepStartTimeOld = day.sleepStartTime ? formatDateTimeForHuman(new Date(day.sleepStartTime)) : '';

            let formattedSleepDuration = '';
            if (day.sleepDuration) {
                const hours = Math.floor(day.sleepDuration / 60);
                const minutes = Math.round(day.sleepDuration % 60);
                formattedSleepDuration = `${hours}小时${minutes}分钟`;
            }

            const sleepStartRef = day.sleepStartRef ? formatDateTimeForHuman(new Date(day.sleepStartRef)) : '';
            const sleepEndRef = day.sleepEndRef ? formatDateTimeForHuman(new Date(day.sleepEndRef)) : '';

            csv += `${day.date},${wakeupTime},${sleepStartTimeOld},${day.sleepDuration || ''},${formattedSleepDuration},${sleepStartRef},${sleepEndRef},${studyMinutes},${taskCount},${day.totalEarnings?.bodyHealth || 0},${day.totalEarnings?.mentalHealth || 0},${day.totalEarnings?.soulNourishment || 0},${day.totalEarnings?.selfImprovement || 0},${day.totalEarnings?.socialBonds || 0},${day.totalEarnings?.total || 0}\n`;
        });
        const BOM = "\uFEFF";
        return BOM + csv;
    };

    const formatDateTimeForHuman = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date)) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const setupDataExport = () => {
        document.getElementById('export-data').addEventListener('click', () => {
            const csvData = StorageService.exportDataToCSV();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `bloom_diary_export_${StorageService.getTodayString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            NotificationsModule.showNotification('导出成功', '数据已成功导出为CSV文件');
        });
    };    

    return {
        KEYS,
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
        // 新增暴露
        getPendingSleep,
        setPendingSleep,
        clearPendingSleep,
        exportDataToCSV,
        setupDataExport
    };
})();