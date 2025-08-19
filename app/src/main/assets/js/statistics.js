/**
 * 统计模块 - 管理数据可视化与统计
 */
const StatisticsModule = (() => {
    // 图表实例
    let dailyChart;
    let periodChart;
    let sleepChart;




    const setupChartTabs = () => {
        const chartTabsContainer = document.querySelector('.chart-tabs');
        if (!chartTabsContainer) return;

        chartTabsContainer.innerHTML = `
            <button class="chart-tab active" data-chart="income">收入</button>
            <button class="chart-tab" data-chart="sleep">睡眠</button>
            <button class="chart-tab" data-chart="wakeup">起床时间</button>
        `;

        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const chartType = tab.dataset.chart;
                showChartByType(chartType);
            });
        });
    };

    const setupWakeupChart = () => {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available, skipping wakeup chart setup');
            return;
        }
        

        let wakeupChartElem = document.getElementById('wakeup-chart');
        if (!wakeupChartElem) {
            wakeupChartElem = document.createElement('canvas');
            wakeupChartElem.id = 'wakeup-chart';
            wakeupChartElem.style.display = 'none';
            document.querySelector('.chart-container').appendChild(wakeupChartElem);
        }
        
        try {
            const wakeupChartCtx = wakeupChartElem.getContext('2d');
            
            wakeupChart = new Chart(wakeupChartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '起床时间',
                        data: [],
                        borderColor: '#f8c3cd',
                        backgroundColor: '#f8c3cd20',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 1.5,
                        pointRadius: 0
                    },
                    {
                        label: '目标时间',
                        data: [],
                        borderColor: '#ffcf5c',
                        backgroundColor: '#ffcf5c20',
                        fill: false,
                        borderDash: [5, 5],
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            autoSkip: true
                        }
                    },
                    y: {
                        reverse: true, 
                        grid: {
                            color: 'rgba(200, 200, 200, 0.05)' // Softer grid lines
                        },
                        ticks: {
                            callback: function(value) {
                                const hours = Math.floor(value);
                                const minutes = Math.round((value - hours) * 60);
                                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const hours = Math.floor(value);
                                const minutes = Math.round((value - hours) * 60);
                                return `${context.dataset.label}: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0 // Ensure no point markers
                    },
                    line: {
                        borderWidth: 1.5
                    }
                }
            }
        });
        } catch (error) {
            console.error('Failed to setup wakeup chart:', error);
        }
    };

    /**
     * Aggregate daily data into monthly buckets for income data
     * @param {Array} dailyData - Array of daily data records
     * @returns {Array} Monthly aggregated data
     */
    const aggregateToMonthly = (dailyData) => {
        const monthlyMap = new Map();
        
        dailyData.forEach(data => {
            const [year, month] = data.date.split('-').slice(0, 2);
            const monthKey = `${year}-${month}`;
            
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, {
                    date: monthKey,
                    totalEarnings: {
                        bodyHealth: 0,
                        mentalHealth: 0,
                        soulNourishment: 0,
                        selfImprovement: 0,
                        socialBonds: 0,
                        total: 0
                    },
                    count: 0
                });
            }
            
            const monthData = monthlyMap.get(monthKey);
            if (data.totalEarnings) {
                monthData.totalEarnings.bodyHealth += data.totalEarnings.bodyHealth || 0;
                monthData.totalEarnings.mentalHealth += data.totalEarnings.mentalHealth || 0;
                monthData.totalEarnings.soulNourishment += data.totalEarnings.soulNourishment || 0;
                monthData.totalEarnings.selfImprovement += data.totalEarnings.selfImprovement || 0;
                monthData.totalEarnings.socialBonds += data.totalEarnings.socialBonds || 0;
                monthData.totalEarnings.total += data.totalEarnings.total || 0;
            }
            monthData.count++;
        });
        
        return Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    };

    /**
     * Aggregate daily sleep data into monthly averages
     * @param {Array} dailyData - Array of daily data records
     * @returns {Array} Monthly sleep data with averages
     */
    const aggregateSleepToMonthly = (dailyData) => {
        const monthlyMap = new Map();
        
        dailyData.forEach(data => {
            if (data.sleepDuration && data.sleepDuration > 0) {
                const [year, month] = data.date.split('-').slice(0, 2);
                const monthKey = `${year}-${month}`;
                
                if (!monthlyMap.has(monthKey)) {
                    monthlyMap.set(monthKey, {
                        date: monthKey,
                        totalSleepMinutes: 0,
                        daysWithSleep: 0
                    });
                }
                
                const monthData = monthlyMap.get(monthKey);
                monthData.totalSleepMinutes += data.sleepDuration;
                monthData.daysWithSleep++;
            }
        });
        
        // Convert to average hours per month
        return Array.from(monthlyMap.values())
            .map(monthData => ({
                date: monthData.date,
                averageSleepHours: monthData.daysWithSleep > 0 
                    ? monthData.totalSleepMinutes / monthData.daysWithSleep / 60 
                    : 0
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    };

    /**
     * @param {string} period - 时间周期类型：'day', 'week', 'month', 'year'
     */
    const updatePeriodChart = (period) => {
        try {
            console.log(`更新周期图表，周期: ${period}`);
            const allData = StorageService.getAllData();
            let filteredData = [];
            let labels = [];
            const currentDate = new Date();
            
            console.log('所有可用数据日期:');
            allData.forEach(data => {
                console.log(`- ${data.date}`);
            });
            
            switch (period) {
                case 'day':
                    filteredData = [allData.find(data => data.date === StorageService.getTodayString())].filter(Boolean);
                    labels = filteredData.map(data => {
                        const [year, month, day] = data.date.split('-').map(Number);
                        return `${month}/${day}`;
                    });
                    break;
                case 'week':
                    filteredData = allData.filter(data => {
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            
                            const diffTime = today - dataDate;
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            return diffDays < 7; 
                        } catch (error) {
                            console.error('日期过滤错误:', error);
                            return false;
                        }
                    });
                    
                    filteredData.sort((a, b) => {
                        const dateA = new Date(a.date);
                        const dateB = new Date(b.date);
                        return dateA - dateB;
                    });
                    
                    labels = filteredData.map(data => {
                        const [year, month, day] = data.date.split('-').map(Number);
                        return `${month}/${day}`;
                    });
                    break;
                case 'month':
                    filteredData = allData.filter(data => {
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            
                            const diffTime = today - dataDate;
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            return diffDays < 30; // 小于30天
                        } catch (error) {
                            console.error('日期过滤错误:', error);
                            return false;
                        }
                    });
                    
                    filteredData.sort((a, b) => {
                        const dateA = new Date(a.date);
                        const dateB = new Date(b.date);
                        return dateA - dateB;
                    });
                    
                    labels = filteredData.map(data => {
                        const [year, month, day] = data.date.split('-').map(Number);
                        return `${month}/${day}`;
                    });
                    break;
                case 'year':
                    // Get data from last 365 days
                    const yearData = allData.filter(data => {
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            
                            const diffTime = today - dataDate;
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            return diffDays < 365; // 小于365天
                        } catch (error) {
                            console.error('日期过滤错误:', error);
                            return false;
                        }
                    });
                    
                    // Aggregate to monthly data
                    filteredData = aggregateToMonthly(yearData);
                    labels = filteredData.map(data => {
                        const [year, month] = data.date.split('-');
                        return `${year.slice(2)}/${month}`; // YY/MM format
                    });
                    break;
            }
            
            console.log(`过滤后数据点数量: ${filteredData.length}`);
            
            const bodyHealthData = filteredData.map(data => data.totalEarnings?.bodyHealth || 0);
            const mentalHealthData = filteredData.map(data => data.totalEarnings?.mentalHealth || 0);
            const soulNourishmentData = filteredData.map(data => data.totalEarnings?.soulNourishment || 0);
            const selfImprovementData = filteredData.map(data => data.totalEarnings?.selfImprovement || 0);
            const socialBondsData = filteredData.map(data => data.totalEarnings?.socialBonds || 0);
            const totalIncomeData = filteredData.map(data => data.totalEarnings?.total || 0);
            
            safeUpdateChart(periodChart, () => {
                periodChart.data.labels = labels;
                periodChart.data.datasets[0].data = bodyHealthData;
                periodChart.data.datasets[1].data = mentalHealthData;
                periodChart.data.datasets[2].data = soulNourishmentData;
                periodChart.data.datasets[3].data = selfImprovementData;
                periodChart.data.datasets[4].data = socialBondsData;
                periodChart.data.datasets[5].data = totalIncomeData;
            });
            
        } catch (error) {
            console.error('更新周期图表出错:', error);
        }
    };

    const showChartByType = (chartType) => {

        document.getElementById('daily-chart').style.display = 'none';
        document.getElementById('period-chart').style.display = 'none';
        document.getElementById('sleep-chart').style.display = 'none';
        document.getElementById('wakeup-chart').style.display = 'none';
        
        const periodType = document.querySelector('.stat-period.active').dataset.period;
        
        switch (chartType) {
            case 'income':
                if (periodType === 'day') {
                    document.getElementById('daily-chart').style.display = 'block';
                } else {
                    document.getElementById('period-chart').style.display = 'block';
                    updatePeriodChart(periodType);
                }
                break;
            case 'sleep':
                document.getElementById('sleep-chart').style.display = 'block';
                updateSleepChart(periodType);
                break;
            case 'wakeup':
                document.getElementById('wakeup-chart').style.display = 'block';
                updateWakeupChart(periodType);
                break;
        }
    };

    const updateWakeupChart = (period) => {
        try {
            console.log(`更新起床图表，周期: ${period}`);
            const allData = StorageService.getAllData();
            let filteredData = [];
            const currentDate = new Date();
            
            switch (period) {
                case 'day':
                    filteredData = [allData.find(data => data.date === StorageService.getTodayString())].filter(Boolean);
                    break;
                case 'week':
                    filteredData = allData.filter(data => {

                        if (data.date === '2025-07-24') {
                            return true;
                        }
                        
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            
                            const diffTime = today - dataDate;
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            return diffDays < 7 && data.wakeupTime;
                        } catch (error) {
                            return false;
                        }
                    });
                    break;
                case 'month':
                    filteredData = allData.filter(data => {
                        
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            
                            const diffTime = today - dataDate;
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            return diffDays < 30 && data.wakeupTime;
                        } catch (error) {
                            return false;
                        }
                    });
                    break;
                case 'year':
                    filteredData = allData.filter(data => {
                        
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            
                            const diffTime = today - dataDate;
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            return diffDays < 365 && data.wakeupTime;
                        } catch (error) {
                            return false;
                        }
                    });
                    break;
            }
            
            filteredData.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA - dateB;
            });
            
            const labels = filteredData.map(data => {
                const [year, month, day] = data.date.split('-').map(Number);
                return `${month}/${day}`;
            });
            
            const wakeupData = filteredData.map(data => {
                if (!data.wakeupTime) return null;
                
                const wakeupDate = new Date(data.wakeupTime);
                return wakeupDate.getHours() + (wakeupDate.getMinutes() / 60);
            });
            
            let targetWakeupTime = 6; // 默认6:00
            const settings = filteredData.length > 0 && filteredData[filteredData.length - 1].earlyWakeSettings;
            if (settings) {
                const [hours, minutes] = settings.endTime.split(':').map(Number);
                targetWakeupTime = hours + (minutes / 60);
            }
            
            const targetData = new Array(labels.length).fill(targetWakeupTime);
            
            safeUpdateChart(wakeupChart, () => {
                wakeupChart.data.labels = labels;
                wakeupChart.data.datasets[0].data = wakeupData;
                wakeupChart.data.datasets[1].data = targetData;
            });
            
        } catch (error) {
            console.error('更新起床时间图表出错:', error);
        }
    };

    const isChartInitialized = (chart) => {
        return chart && chart.canvas && chart.canvas.getContext;
    };
    
    const safeUpdateChart = (chart, updateFunction) => {
        try {
            if (isChartInitialized(chart)) {
                updateFunction();
                chart.update('none');
                return true;
            } else {
                console.error('图表未初始化');
                return false;
            }
        } catch (error) {
            console.error('更新图表时出错:', error);
            return false;
        }
    };
    
    // 将原 initialize 中“Chart 不存在就直接简化”的逻辑，改为先短暂重试一次
    const initializeWithChart = () => {
        try {
            setupCharts();
            setupChartTabs();
            setupWakeupChart();
            setupPeriodSwitching();
            
            if (document.querySelectorAll('.chart-tab').length > 0) {
                setupChartTypeSwitching();
            }
            
            setupDataExport();
            setTimeout(() => {
                updateDailyChart();
            }, 100);
            console.log('统计模块初始化完成');
        } catch (error) {
            console.error('统计模块初始化失败:', error);
            setupLimitedStatistics();
        }
    };

    const initialize = () => {
        console.log('初始化统计模块...');
        
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js 未就绪，稍后重试一次再决定是否进入简化模式');
            setTimeout(() => {
                if (typeof Chart === 'undefined') {
                    console.warn('Chart.js 仍未加载，使用简化统计模式');
                    setupLimitedStatistics();
                } else {
                    console.log('Chart.js 现在可用，初始化完整图表功能');
                    initializeWithChart();
                }
            }, 1000); // Increased timeout to give Chart.js more time to load
            return;
        }
        
        initializeWithChart();
    };
    
    // Setup limited statistics when Chart.js is not available
    const setupLimitedStatistics = () => {
        console.log('Setting up limited statistics mode...');
        
        // Hide chart elements and show basic statistics
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="no-charts-message">
                    <p>图表功能暂时不可用（Chart.js 未加载）</p>
                    <div class="basic-stats">
                        <h4>基本统计信息</h4>
                        <div id="basic-stats-content">
                            <p>今日收入: <span id="basic-today-earnings">0</span> 元</p>
                            <p>总任务完成: <span id="basic-total-tasks">0</span> 个</p>
                            <p>学习时间: <span id="basic-study-time">0</span> 分钟</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Update basic statistics
        updateBasicStatistics();
        
        // Setup period switching for basic stats
        setupBasicStatsPeriodSwitching();
        
        // Setup data export (this doesn't require Chart.js)
        setupDataExport();
    };
    
    // Update basic statistics
    const updateBasicStatistics = () => {
        try {
            const todayData = StorageService.getTodayData();
            
            const todayEarningsElem = document.getElementById('basic-today-earnings');
            const totalTasksElem = document.getElementById('basic-total-tasks');
            const studyTimeElem = document.getElementById('basic-study-time');
            
            if (todayEarningsElem) {
                todayEarningsElem.textContent = todayData.totalEarnings.total.toFixed(2);
            }
            
            if (totalTasksElem) {
                totalTasksElem.textContent = todayData.completedTasks.length;
            }
            
            if (studyTimeElem) {
                const totalStudyTime = todayData.studySessions.reduce((total, session) => total + session.duration, 0);
                studyTimeElem.textContent = totalStudyTime;
            }
        } catch (error) {
            console.error('Failed to update basic statistics:', error);
        }
    };
    
    // Setup period switching for basic statistics
    const setupBasicStatsPeriodSwitching = () => {
        document.querySelectorAll('.stat-period').forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('.stat-period').forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                
                // Update basic statistics based on period
                const period = this.dataset.period;
                updateBasicStatisticsForPeriod(period);
            });
        });
    };
    
    // Update basic statistics for a specific period
    const updateBasicStatisticsForPeriod = (period) => {
        // For now, just update with today's data
        // This could be enhanced to show period-specific data
        updateBasicStatistics();
    };
    
    const setupCharts = () => {
        console.log('设置图表...');
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available, skipping chart setup');
            return;
        }
        
        const dailyChartElem = document.getElementById('daily-chart');
        const periodChartElem = document.getElementById('period-chart');
        const sleepChartElem = document.getElementById('sleep-chart');
        
        if (!dailyChartElem || !periodChartElem) {
            console.error('图表元素不存在');
            return;
        }
        
        try {
            const dailyChartCtx = dailyChartElem.getContext('2d');
            const periodChartCtx = periodChartElem.getContext('2d');

            Chart.defaults.font.family = "'PingFang SC', 'Helvetica Neue', Arial, sans-serif";
            Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            
            // Apply lighter visual defaults globally
            Chart.defaults.elements.point.radius = 0; // No point markers by default
            Chart.defaults.elements.line.borderWidth = 1.5; // Thinner lines
            
            dailyChart = new Chart(dailyChartCtx, {
                type: 'doughnut',
                data: {
                    labels: ['身体健康', '心理健康', '灵魂滋养', '自我提升', '广结善缘'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            '#f8c3cd', // 粉色 - 身体健康
                            '#a5d8ff', // 浅蓝 - 心理健康
                            '#b5e6b5', // 淡绿 - 灵魂滋养
                            '#ffcf5c', // 浅黄 - 自我提升
                            '#d4a5ff'  // 紫色 - 广结善缘
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    return `${label}: ${value}元`;
                                }
                            }
                        }
                    }
                }
            });
            
            periodChart = new Chart(periodChartCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: '身体健康',
                            data: [],
                            borderColor: '#f8c3cd',
                            backgroundColor: '#f8c3cd20',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1.5,
                            pointRadius: 0
                        },
                        {
                            label: '心理健康',
                            data: [],
                            borderColor: '#a5d8ff',
                            backgroundColor: '#a5d8ff20',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1.5,
                            pointRadius: 0
                        },
                        {
                            label: '灵魂滋养',
                            data: [],
                            borderColor: '#b5e6b5',
                            backgroundColor: '#b5e6b520',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1.5,
                            pointRadius: 0
                        },
                        {
                            label: '自我提升',
                            data: [],
                            borderColor: '#ffcf5c',
                            backgroundColor: '#ffcf5c20',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1.5,
                            pointRadius: 0
                        },
                        {
                            label: '广结善缘',
                            data: [],
                            borderColor: '#d4a5ff', 
                            backgroundColor: '#d4a5ff20',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1.5,
                            pointRadius: 0
                        },
                        {
                            label: '总收入',
                            data: [],
                            borderColor: '#6e7891',
                            backgroundColor: '#6e789120',
                            fill: false,
                            tension: 0.4,
                            borderWidth: 2, // Keep total series slightly thicker
                            borderDash: [5, 5],
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxTicksLimit: 8,
                                autoSkip: true
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(200, 200, 200, 0.05)' // Softer grid lines
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y || 0;
                                    return `${label}: ${value}元`;
                                }
                            }
                        },
                        decimation: {
                            enabled: true,
                            algorithm: 'lttb',
                            samples: 80,
                            threshold: 100
                        }
                    },
                    elements: {
                        point: {
                            radius: 0 // Ensure no point markers
                        },
                        line: {
                            borderWidth: 1.5
                        }
                    }
                }
            });
            
            if (sleepChartElem) {
                const sleepChartCtx = sleepChartElem.getContext('2d');
                sleepChart = new Chart(sleepChartCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [
                            {
                                label: '睡眠时长(小时)',
                                data: [],
                                backgroundColor: '#a5d8ff',
                                borderColor: '#81c3ff',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    maxTicksLimit: 8,
                                    autoSkip: true
                                }
                            },
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(200, 200, 200, 0.05)' // Softer grid lines
                                },
                                ticks: {
                                    callback: function(value) {
                                        return value + 'h';
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const hours = Math.floor(context.raw);
                                        const minutes = Math.round((context.raw - hours) * 60);
                                        return `睡眠时长: ${hours}小时${minutes}分钟`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            console.log('图表设置完成');
        } catch (error) {
            console.error('设置图表时出错:', error);
        }
    };

    // 更新每日图表数据
    const updateDailyChart = () => {
        console.log('更新每日图表...');
        
        try {
            const todayData = StorageService.getTodayData();
            const earnings = todayData.totalEarnings;
            
            if (!isChartInitialized(dailyChart)) {
                console.error('每日图表未初始化，尝试重新初始化...');
                setupCharts();
                if (!isChartInitialized(dailyChart)) {
                    console.error('重新初始化失败，放弃更新');
                    return;
                }
            }
            
            // 更新图表数据
            safeUpdateChart(dailyChart, () => {
                dailyChart.data.datasets[0].data = [
                    earnings.bodyHealth || 0,
                    earnings.mentalHealth || 0,
                    earnings.soulNourishment || 0,
                    earnings.selfImprovement || 0,
                    earnings.socialBonds || 0
                ];
            });
            
            // 显示每日图表，隐藏周期图表
            document.getElementById('daily-chart').style.display = 'block';
            
            const periodChartElem = document.getElementById('period-chart');
            if (periodChartElem) {
                periodChartElem.style.display = 'none';
            }
            
            const sleepChartElem = document.getElementById('sleep-chart');
            if (sleepChartElem) {
                sleepChartElem.style.display = 'none';
            }
            
            console.log('每日图表更新完成');
        } catch (error) {
            console.error('更新每日图表时出错:', error);
        }
    };    
    
    const setupDataExport = () => {
        const exportBtn = document.getElementById('export-data');
        
        if (!exportBtn) {
            console.error('未找到导出数据按钮');
            return;
        }
        
        // 移除可能的旧事件监听器
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        
        // 添加新的事件监听器
        newExportBtn.addEventListener('click', async function(event) {
            event.preventDefault();
            await exportCSV();
        });
        
        console.log('CSV导出按钮事件已绑定');
    };
    
    // 设置图表类型切换
    const setupChartTypeSwitching = () => {
        document.querySelectorAll('.chart-tab').forEach(tab => {
            // 移除旧事件监听器
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // 添加新的事件监听器
            newTab.addEventListener('click', () => {
                console.log('切换图表类型:', newTab.dataset.chart);
                
                // 移除所有标签的active类
                document.querySelectorAll('.chart-tab').forEach(t => {
                    t.classList.remove('active');
                });
                
                // 添加active类到当前标签
                newTab.classList.add('active');
                
                const chartType = newTab.dataset.chart;
                const periodType = document.querySelector('.stat-period.active').dataset.period;
                
                // 隐藏所有图表
                document.getElementById('daily-chart').style.display = 'none';
                document.getElementById('period-chart').style.display = 'none';
                document.getElementById('sleep-chart').style.display = 'none';
                if (document.getElementById('wakeup-chart')) {
                    document.getElementById('wakeup-chart').style.display = 'none';
                }
                
                if (chartType === 'income') {
                    if (periodType === 'day') {
                        // 显示每日收入饼图
                        document.getElementById('daily-chart').style.display = 'block';
                        updateDailyChart();
                    } else {
                        // 显示周期收入折线图
                        document.getElementById('period-chart').style.display = 'block';
                        updatePeriodChart(periodType);
                    }
                } else if (chartType === 'sleep') {
                    // 更新并显示睡眠图表
                    updateSleepChart(periodType);
                    document.getElementById('sleep-chart').style.display = 'block';
                } else if (chartType === 'wakeup' && document.getElementById('wakeup-chart')) {
                    // 更新并显示起床图表
                    updateWakeupChart(periodType);
                    document.getElementById('wakeup-chart').style.display = 'block';
                }
            });
        });
    };
    
    // 更新睡眠图表
    // 更新睡眠图表（读取起床当天的 sleepDuration）
    const updateSleepChart = (period) => {
        try {
            console.log(`更新睡眠图表，周期: ${period}`);
            const allData = StorageService.getAllData();
            let filteredData = [];
            let labels = [];
            let sleepData = [];
            const currentDate = new Date();
            
            switch (period) {
                case 'day':
                    filteredData = allData.filter(data => data.date === StorageService.getTodayString());
                    labels = filteredData.map(data => {
                        const [y, m, d] = data.date.split('-').map(Number);
                        return `${m}/${d}`;
                    });
                    sleepData = filteredData.map(data => (data.sleepDuration ? data.sleepDuration / 60 : 0));
                    break;
                case 'week':
                    filteredData = allData.filter(data => {
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            const diffDays = Math.floor((today - dataDate) / (1000 * 60 * 60 * 24));
                            return diffDays < 7 && data.sleepDuration > 0;
                        } catch {
                            return false;
                        }
                    });
                    
                    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
                    labels = filteredData.map(data => {
                        const [y, m, d] = data.date.split('-').map(Number);
                        return `${m}/${d}`;
                    });
                    sleepData = filteredData.map(data => (data.sleepDuration ? data.sleepDuration / 60 : 0));
                    break;
                case 'month':
                    filteredData = allData.filter(data => {
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            const diffDays = Math.floor((today - dataDate) / (1000 * 60 * 60 * 24));
                            return diffDays < 30 && data.sleepDuration > 0;
                        } catch {
                            return false;
                        }
                    });
                    
                    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
                    labels = filteredData.map(data => {
                        const [y, m, d] = data.date.split('-').map(Number);
                        return `${m}/${d}`;
                    });
                    sleepData = filteredData.map(data => (data.sleepDuration ? data.sleepDuration / 60 : 0));
                    break;
                case 'year':
                    // Get data from last 365 days and aggregate to monthly averages
                    const yearData = allData.filter(data => {
                        try {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const dataDate = new Date(year, month - 1, day);
                            dataDate.setHours(0, 0, 0, 0);
                            const today = new Date(currentDate);
                            today.setHours(0, 0, 0, 0);
                            const diffDays = Math.floor((today - dataDate) / (1000 * 60 * 60 * 24));
                            return diffDays < 365 && data.sleepDuration > 0;
                        } catch {
                            return false;
                        }
                    });
                    
                    // Aggregate to monthly averages
                    const monthlyAverages = aggregateSleepToMonthly(yearData);
                    labels = monthlyAverages.map(data => {
                        const [year, month] = data.date.split('-');
                        return `${year.slice(2)}/${month}`; // YY/MM format
                    });
                    sleepData = monthlyAverages.map(data => data.averageSleepHours);
                    break;
            }
            
            if (!sleepChart) return;
            
            sleepChart.data.labels = labels;
            sleepChart.data.datasets[0].data = sleepData;
            
            sleepChart.update('none');
        } catch (error) {
            console.error('更新睡眠图表出错:', error);
        }
    };

    
    // 修改 setupPeriodSwitching 函数
    const setupPeriodSwitching = () => {
        document.querySelectorAll('.stat-period').forEach(btn => {

            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                console.log('切换统计周期:', newBtn.dataset.period);
                
                document.querySelectorAll('.stat-period').forEach(b => {
                    b.classList.remove('active');
                });
                
                newBtn.classList.add('active');
                
                const period = newBtn.dataset.period;
                const activeChartType = document.querySelector('.chart-tab.active');
                const chartType = activeChartType ? activeChartType.dataset.chart : 'income';
                
                if (chartType === 'income') {
                    if (period === 'day') {
                        // 显示每日图表
                        updateDailyChart();
                    } else {
                        // 更新并显示周期图表
                        updatePeriodChart(period);
                        document.getElementById('daily-chart').style.display = 'none';
                        document.getElementById('period-chart').style.display = 'block';
                    }
                } else if (chartType === 'sleep') {
                    // 更新并显示睡眠图表
                    updateSleepChart(period);
                    document.getElementById('daily-chart').style.display = 'none';
                    document.getElementById('period-chart').style.display = 'none';
                    document.getElementById('sleep-chart').style.display = 'block';
                } else if (chartType === 'wakeup' && document.getElementById('wakeup-chart')) {
                    // 更新并显示起床图表
                    updateWakeupChart(period);
                    document.getElementById('daily-chart').style.display = 'none';
                    document.getElementById('period-chart').style.display = 'none';
                    document.getElementById('sleep-chart').style.display = 'none';
                    document.getElementById('wakeup-chart').style.display = 'block';
                }
            });
        });
    };
    
    // 辅助探测
    const env = {
        ua: (navigator.userAgent || '').toLowerCase(),
        get isAndroid() { return /android/i.test(this.ua); },
        get isWebView() { return /; wv\)/.test(this.ua) || /\bwv\b/.test(this.ua); },
        get isFileScheme() { return location.protocol === 'file:'; },
        get hasWebShare() { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; },
        get hasCanShare() { return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'; }
    };

    // 尝试用 Web Share 分享“文件”
    async function tryWebShareFile(blob, fileName) {
        if (!env.hasWebShare) return false;
        let fileForShare = null;
        try {
            fileForShare = new File([blob], fileName, { type: 'text/csv' });
        } catch (_) {
            // 老设备不支持 File 构造器
            return false;
        }
        if (env.hasCanShare && !navigator.canShare({ files: [fileForShare] })) {
            return false;
        }
        try {
            await navigator.share({
                files: [fileForShare],
                title: '成长小账本导出',
                text: 'CSV 数据文件'
            });
            return true;
        } catch (e) {
            if (e?.name === 'AbortError') return true; // 用户取消也视为已唤起过
            console.warn('Web Share（文件）失败:', e);
            return false;
        }
    }

    // 尝试用 Web Share 分享“文本”
    async function tryWebShareText(title, text) {
        if (!env.hasWebShare) return false;
        try {
            await navigator.share({ title, text });
            return true;
        } catch (e) {
            if (e?.name === 'AbortError') return true;
            console.warn('Web Share（文本）失败:', e);
            return false;
        }
    }

    // 拷贝到剪贴板（作为最后兜底）
    async function tryCopyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) {}
        return false;
    }

    // UTF-8 安全的 Base64 编码
    function toBase64Utf8(str) {
        try {
            if (window.TextEncoder) {
                const bytes = new TextEncoder().encode(str);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                return btoa(binary);
            }
        } catch (_) {}
        // 兼容老环境
        return btoa(unescape(encodeURIComponent(str)));
    }

    const exportCSV = async () => {
        try {
            const csvData = StorageService.exportDataToCSV();
            if (!csvData) throw new Error('CSV数据生成失败');

            const fileName = `bloom_diary_export_${StorageService.getTodayString()}.csv`;
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

            // 1) 如果存在原生桥，优先用原生分享（最佳体验，支持微信）
            if (window.AndroidShare && typeof window.AndroidShare.shareFileBase64 === 'function') {
                try {
                    const b64 = toBase64Utf8(csvData);

                    // 先保存到“数据文件夹”（供设置页查看/再次分享）
                    try { await FileVault.saveText(fileName, csvData, 'text/csv'); } catch (e) {}

                    window.AndroidShare.shareFileBase64(b64, 'text/csv', fileName);
                    NotificationsModule?.showNotification('已打开分享', '请选择微信或其他应用发送文件');
                    return;
                } catch (e) {
                    console.warn('原生分享失败，回退 Web Share/下载:', e);
                }
            }

            // 2) Web Share（文件）
            let shared = false;
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                try {
                    let fileForShare;
                    try {
                        fileForShare = new File([blob], fileName, { type: 'text/csv' });
                    } catch (_) { fileForShare = null; }

                    const canShareFiles = typeof navigator.canShare === 'function'
                        ? (fileForShare ? navigator.canShare({ files: [fileForShare] }) : false)
                        : !!fileForShare;

                    if (fileForShare && canShareFiles) {
                        await navigator.share({ files: [fileForShare], title: '成长小账本', text: '导出的数据文件（CSV）' });
                        shared = true;
                    } else {
                        // 退化为分享文本
                        await navigator.share({
                            title: '成长小账本导出',
                            text: `文件名：${fileName}\n（当前环境不支持直接分享文件，以下为前500字预览）\n\n${csvData.slice(0, 500)}`
                        });
                        shared = true;
                    }
                } catch (err) {
                    if (err?.name !== 'AbortError') console.warn('Web Share 失败:', err);
                }
            }

            // 3) 仍未分享：保存或下载兜底
            if (!shared) {
                let savedOk = false;
                try { savedOk = await FileVault.saveText(fileName, csvData, 'text/csv'); } catch (_) {}

                if (savedOk) {
                    NotificationsModule?.showNotification('导出成功', `已保存到数据文件夹：${fileName}（设置 → 数据文件夹 可查看/再次分享）`);
                } else {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 100);
                    NotificationsModule?.showNotification('导出完成', `文件已下载: ${fileName}`);
                }
            } else {
                NotificationsModule?.showNotification('已打开分享', '请选择微信或其他应用');
            }
        } catch (error) {
            console.error('导出CSV失败:', error);
            NotificationsModule?.showNotification('导出失败', `导出CSV时出错: ${error.message || '未知错误'}`);
        }
    };
    
    // 公开API
    return {
        initialize,
        updateDailyChart,
        updatePeriodChart,
        updateSleepChart,
        updateWakeupChart,
        exportCSV
    };
})();