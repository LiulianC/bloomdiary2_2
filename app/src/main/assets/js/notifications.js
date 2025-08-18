/**
 * 通知模块 - 管理应用通知系统
 */
const NotificationsModule = (() => {
    // 检查通知权限
    const checkPermission = () => {
        if (!('Notification' in window)) {
            console.log('该浏览器不支持通知');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        } else if (Notification.permission !== 'denied') {
            // 请求权限
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    return true;
                }
            });
        }
        
        return false;
    };
    
    // 显示通知
    const showNotification = (title, message) => {
        // 首先检查是否有通知权限
        const hasPermission = checkPermission();
        
        // 应用内通知（不依赖于系统通知权限）
        showInAppNotification(title, message);
        
        // 如果有通知权限，显示系统通知
        if (hasPermission) {
            try {
                const notification = new Notification(title, {
                    body: message,
                    icon: 'img/icons/icon-192x192.png'
                });
                
                // 点击通知时的行为
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            } catch (error) {
                console.error('无法显示通知:', error);
            }
        }
    };
    
    // 显示应用内通知
    const showInAppNotification = (title, message) => {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'in-app-notification';
        
        notification.innerHTML = `
            <div class="notification-content">
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
            <button class="close-notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // 添加样式
        notification.style.position = 'fixed';
        notification.style.bottom = '80px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'var(--bg-card)';
        notification.style.color = 'var(--text-primary)';
        notification.style.padding = 'var(--spacing-md)';
        notification.style.borderRadius = 'var(--border-radius-md)';
        notification.style.boxShadow = 'var(--shadow-md)';
        notification.style.zIndex = '100';
        notification.style.maxWidth = '90%';
        notification.style.width = '320px';
        notification.style.display = 'flex';
        notification.style.justifyContent = 'space-between';
        notification.style.alignItems = 'flex-start';
        notification.style.gap = 'var(--spacing-md)';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        
        // 添加到文档
        document.body.appendChild(notification);
        
        // 显示通知（增加透明度）
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // 关闭按钮处理
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        });
        
        // 3秒后自动关闭
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    };
    
    // 设置定时提醒
    const setupTimedReminders = () => {
        // 检查是否需要提醒
        const checkTimeForReminders = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            
            // 早上8点提醒
            if (hours === 8 && minutes === 0) {
                showNotification('早安提醒', '新的一天开始了，记得打卡起床！');
            }
            
            // 中午12点提醒
            if (hours === 12 && minutes === 0) {
                showNotification('午间提醒', '别忘了午餐时间，记得休息一下眼睛！');
            }
            
            // 傍晚6点提醒
            if (hours === 18 && minutes === 0) {
                showNotification('傍晚提醒', '一天即将结束，检查一下今天的任务完成情况吧！');
            }
            
            // 晚上9点提醒（提前结算通知）
            if (hours === 21 && minutes === 0) {
                showNotification('晚间提醒', '即将到达结算时间(22:00)，记得检查未完成的任务！');
            }
            
            // 晚上10点结算
            if (hours === 22 && minutes === 0) {
                // 生成每日总结
                generateDailySummary();
            }
        };
        
        // 每分钟检查一次
        setInterval(checkTimeForReminders, 60 * 1000);
        
        // 立即检查一次（页面加载时）
        checkTimeForReminders();
    };
    
    // 生成每日总结
    const generateDailySummary = () => {
        const todayData = StorageService.getTodayData();
        
        // 统计学习时间
        const studyMinutes = todayData.studySessions.reduce((total, session) => {
            return total + session.duration;
        }, 0);
        
        // 统计完成任务数
        const completedTasksCount = todayData.completedTasks.length;
        
        // 生成总结消息
        let summaryMessage = `📊 今日成就：\n`;
        summaryMessage += `- 完成了 ${completedTasksCount} 个任务\n`;
        summaryMessage += `- 学习了 ${studyMinutes} 分钟\n`;
        summaryMessage += `- 总收入：${todayData.totalEarnings.total.toFixed(2)} 元`;
        
        // 显示通知
        showNotification('每日总结', summaryMessage);
    };
    
    // 初始化通知系统
    const initialize = () => {
        // 检查通知权限
        checkPermission();
        
        // 设置定时提醒
        setupTimedReminders();
    };
    
    // 公开API
    return {
        initialize,
        showNotification
    };
})();