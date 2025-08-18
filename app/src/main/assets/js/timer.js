/**
 * 计时器模块 - 管理学习计时功能
 */
const TimerModule = (() => {
    // 私有变量
    let timerInterval;
    let startTime;
    let elapsedTime = 0;
    let targetTime = 0;
    let isRunning = false;
    let isCountdown = false;
    
    // DOM元素
    const timerDisplay = document.getElementById('timer');
    const startButton = document.getElementById('start-timer');
    const pauseButton = document.getElementById('pause-timer');
    const stopButton = document.getElementById('stop-timer');
    const countdownOptions = document.getElementById('countdown-options');
    
    // 格式化时间为 HH:MM:SS
    const formatTime = (timeInSeconds) => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    // 更新计时器显示
    const updateDisplay = () => {
        if (isCountdown) {
            const remainingTime = Math.max(0, targetTime - elapsedTime);
            timerDisplay.textContent = formatTime(remainingTime);
            
            // 检查是否完成倒计时
            if (remainingTime === 0 && isRunning) {
                completeTimer(true);
            }
        } else {
            timerDisplay.textContent = formatTime(elapsedTime);
        }
    };
    
    // 开始计时
    const startTimer = () => {
        if (isRunning) return;
        
        if (!startTime) {
            startTime = Date.now() - (elapsedTime * 1000);
        } else {
            startTime = Date.now() - (elapsedTime * 1000);
        }
        
        timerInterval = setInterval(() => {
            elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            updateDisplay();
        }, 1000);
        
        isRunning = true;
        
        // 更新按钮状态
        startButton.disabled = true;
        pauseButton.disabled = false;
        stopButton.disabled = false;
    };
    
    // 暂停计时
    const pauseTimer = () => {
        if (!isRunning) return;
        
        clearInterval(timerInterval);
        isRunning = false;
        
        // 更新按钮状态
        startButton.disabled = false;
        pauseButton.disabled = true;
    };
    
    // 停止计时
    const stopTimer = () => {
        if (!startTime) return;
        
        // 显示确认弹窗 - 添加特殊class标记
        const modalOverlay = document.getElementById('modal-overlay');
        const exitModal = document.getElementById('exit-confirm-modal');
        
        modalOverlay.classList.add('show-exit-modal'); // 添加这行
        modalOverlay.classList.remove('hidden');
        exitModal.classList.remove('hidden');
    };
    
    // 计时完成处理
    const completeTimer = (isNormalCompletion = true) => {
        clearInterval(timerInterval);
        
        const duration = Math.floor(elapsedTime / 60); // 转换为分钟
        const hourlyRate = isNormalCompletion ? 10 : 8; // 正常完成10元/小时，中断8元/小时
        const earnings = (duration / 60) * hourlyRate;
        
        // 创建学习记录
        const studySession = {
            id: Date.now().toString(),
            startTime: new Date(startTime).toISOString(),
            endTime: new Date().toISOString(),
            duration: duration,
            completed: isNormalCompletion,
            earnings: parseFloat(earnings.toFixed(2))
        };
        
        // 保存到今日数据
        const todayData = StorageService.getTodayData();
        todayData.studySessions.push(studySession);
        
        // 更新自我提升类别的收入
        todayData.totalEarnings.selfImprovement += studySession.earnings;
        todayData.totalEarnings.total += studySession.earnings;
        
        StorageService.updateTodayData(todayData);
        
        // 显示通知
        NotificationsModule.showNotification(
            '学习完成',
            `你完成了 ${duration} 分钟的学习，获得 ${studySession.earnings} 元收入！`
        );
        
        // 重置计时器
        resetTimer();
        
        // 更新UI
        updateDailyOverview();
    };
    
    // 重置计时器
    const resetTimer = () => {
        clearInterval(timerInterval);
        startTime = null;
        elapsedTime = 0;
        isRunning = false;
        
        // 重置计时器显示
        updateDisplay();
        
        // 更新按钮状态
        startButton.disabled = false;
        pauseButton.disabled = true;
        stopButton.disabled = true;
    };
    
    // 设置倒计时模式
    const setCountdownMode = (isEnabled) => {
        isCountdown = isEnabled;
        countdownOptions.style.display = isEnabled ? 'flex' : 'none';
        
        resetTimer();
        
        if (isEnabled) {
            // 默认选择第一个时长选项
            const firstOption = countdownOptions.querySelector('button');
            if (firstOption) {
                setCountdownTime(parseInt(firstOption.dataset.time));
                firstOption.classList.add('active');
            }
        } else {
            timerDisplay.textContent = '00:00:00';
        }
    };
    
    // 设置倒计时时间
    const setCountdownTime = (minutes) => {
        targetTime = minutes * 60; // 转换为秒
        elapsedTime = 0;
        updateDisplay();
    };
    
    // 初始化计时器模块
    const initialize = () => {
        // 初始化计时器显示
        timerDisplay.textContent = '00:00:00';
        
        // 设置计时器模式切换
        document.querySelectorAll('input[name="timer-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                setCountdownMode(e.target.value === 'countdown');
            });
        });
        
        // 设置倒计时选项
        countdownOptions.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有active类
                countdownOptions.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                // 添加active类到当前按钮
                btn.classList.add('active');
                // 设置倒计时时间
                setCountdownTime(parseInt(btn.dataset.time));
            });
        });
        
        // 注册按钮事件
        startButton.addEventListener('click', startTimer);
        pauseButton.addEventListener('click', pauseTimer);
        stopButton.addEventListener('click', stopTimer);
        
        // 在 js/timer.js 的确认和取消按钮事件中添加
        document.getElementById('confirm-exit').addEventListener('click', () => {
            document.getElementById('modal-overlay').classList.add('hidden');
            document.getElementById('modal-overlay').classList.remove('show-exit-modal'); // 添加这行
            document.getElementById('exit-confirm-modal').classList.add('hidden');
            completeTimer(false);
        });

        document.getElementById('cancel-exit').addEventListener('click', () => {
            document.getElementById('modal-overlay').classList.add('hidden');
            document.getElementById('modal-overlay').classList.remove('show-exit-modal'); // 添加这行
            document.getElementById('exit-confirm-modal').classList.add('hidden');
        });
        
        // 关闭弹窗按钮
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('modal-overlay').classList.add('hidden');
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.add('hidden');
                });
            });
        });
    };
    
    // 公开API
    return {
        initialize,
        startTimer,
        pauseTimer,
        stopTimer,
        resetTimer
    };
})();