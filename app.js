// ==================== 游戏化人生系统 v3 - Phase 3 大更新 ====================

// ==================== 数据定义 ====================

const ACTION_LIBRARY = [
    { id: 'nap', name: '小睡15分钟', category: '恢复', icon: '😴', energy: 15, mental: 5, charm: 0, dailyLimit: null },
    { id: 'walk', name: '散步20分钟', category: '恢复', icon: '🚶', energy: 10, mental: 10, charm: 0, dailyLimit: null },
    { id: 'meditate', name: '冥想10分钟', category: '恢复', icon: '🧘', energy: 5, mental: 15, charm: 0, dailyLimit: null },
    { id: 'early_sleep', name: '早睡(23点前)', category: '恢复', icon: '🌙', energy: 20, mental: 10, charm: 0, dailyLimit: 1 },
    { id: 'meal', name: '规律三餐', category: '维持', icon: '🍽️', energy: 10, mental: 5, charm: 0, dailyLimit: 3 },
    { id: 'clean', name: '整理房间', category: '维持', icon: '🧹', energy: -5, mental: 10, charm: 0, dailyLimit: null },
    { id: 'grooming', name: '洗漱护理', category: '维持', icon: '🚿', energy: 0, mental: 5, charm: 1, dailyLimit: 2 },
    { id: 'read', name: '阅读30分钟', category: '成长', icon: '📚', energy: -5, mental: 15, charm: 0, dailyLimit: null },
    { id: 'learn', name: '学习新技能1小时', category: '成长', icon: '📖', energy: -10, mental: 20, charm: 0, dailyLimit: null },
    { id: 'exercise', name: '运动健身', category: '成长', icon: '💪', energy: -15, mental: 15, charm: 1, dailyLimit: null },
    { id: 'work', name: '完成一项工作', category: '成长', icon: '✅', energy: -10, mental: 20, charm: 0, dailyLimit: null },
    { id: 'contact', name: '主动联系朋友', category: '社交', icon: '📱', energy: -5, mental: 10, charm: 1, dailyLimit: null },
    { id: 'social', name: '外出社交活动', category: '社交', icon: '🎉', energy: -10, mental: 15, charm: 2, dailyLimit: null },
];

const THRESHOLDS = {
    energy: {
        excellent: { min: 80, label: '充沛', color: 'success' },
        normal: { min: 50, label: '正常', color: 'normal' },
        tired: { min: 20, label: '疲劳', color: 'warning' },
        exhausted: { min: 0, label: '透支', color: 'danger' }
    },
    mental: {
        positive: { min: 70, label: '积极', color: 'success' },
        normal: { min: 40, label: '一般', color: 'normal' },
        low: { min: 0, label: '低落', color: 'warning' }
    }
};

// ==================== 状态管理 ====================

class GameState {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('gamified-life-data');
        if (saved) {
            const data = JSON.parse(saved);
            this.energy = data.energy ?? 75;
            this.mental = data.mental ?? 62;
            this.charm = data.charm ?? 5;
            this.history = data.history ?? [];
            this.dailyCounts = data.dailyCounts ?? {};
            this.lastDate = data.lastDate ?? new Date().toDateString();
            this.dailySnapshots = data.dailySnapshots ?? {};
        } else {
            this.energy = 75;
            this.mental = 62;
            this.charm = 5;
            this.history = [];
            this.dailyCounts = {};
            this.lastDate = new Date().toDateString();
            this.dailySnapshots = {};
        }

        // 新的一天：重置每日计数，保存前一天快照
        const today = new Date().toDateString();
        if (this.lastDate !== today) {
            // 保存前一天的状态快照
            this.dailySnapshots[this.lastDate] = {
                energy: this.energy,
                mental: this.mental,
                actions: this.getTodayHistory().length
            };
            this.dailyCounts = {};
            this.lastDate = today;
            this.save();
        }
    }

    save() {
        localStorage.setItem('gamified-life-data', JSON.stringify({
            energy: this.energy,
            mental: this.mental,
            charm: this.charm,
            history: this.history,
            dailyCounts: this.dailyCounts,
            lastDate: this.lastDate,
            dailySnapshots: this.dailySnapshots
        }));
    }

    performAction(actionId) {
        const action = ACTION_LIBRARY.find(a => a.id === actionId);
        if (!action) return null;

        if (action.dailyLimit) {
            const count = this.dailyCounts[actionId] || 0;
            if (count >= action.dailyLimit) return null;
        }

        if (action.energy < 0 && this.energy + action.energy < 0) return null;

        const before = { energy: this.energy, mental: this.mental, charm: this.charm };

        this.energy = Math.max(0, Math.min(100, this.energy + action.energy));
        this.mental = Math.max(0, Math.min(100, this.mental + action.mental));
        this.charm = Math.max(0, this.charm + action.charm);

        const record = {
            id: Date.now(),
            actionId: action.id,
            actionName: action.name,
            actionCategory: action.category,
            timestamp: new Date().toISOString(),
            changes: { energy: action.energy, mental: action.mental, charm: action.charm },
            before,
            after: { energy: this.energy, mental: this.mental, charm: this.charm }
        };
        this.history.unshift(record);

        if (action.dailyLimit) {
            this.dailyCounts[actionId] = (this.dailyCounts[actionId] || 0) + 1;
        }

        this.save();
        return record;
    }

    getTodayHistory() {
        const today = new Date().toDateString();
        return this.history.filter(h => new Date(h.timestamp).toDateString() === today);
    }

    getWeekHistory() {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return this.history.filter(h => new Date(h.timestamp) >= weekAgo);
    }

    getActionLimit(actionId) {
        const action = ACTION_LIBRARY.find(a => a.id === actionId);
        if (!action || !action.dailyLimit) return null;
        const used = this.dailyCounts[actionId] || 0;
        return { used, limit: action.dailyLimit, remaining: action.dailyLimit - used };
    }

    getUsageStreak() {
        const dates = [...new Set(this.history.map(h => new Date(h.timestamp).toDateString()))];
        if (dates.length === 0) return 0;
        dates.sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        let checkDate = new Date();
        for (const dateStr of dates) {
            const date = new Date(dateStr);
            if (date.toDateString() === checkDate.toDateString()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (date < checkDate) {
                break;
            }
        }
        return streak;
    }
}

// ==================== 习惯管理 ====================

class HabitManager {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('gamified-life-habits');
        this.habits = saved ? JSON.parse(saved) : [];
    }

    save() {
        localStorage.setItem('gamified-life-habits', JSON.stringify(this.habits));
    }

    addHabit(name, icon) {
        const habit = {
            id: Date.now().toString(),
            name,
            icon,
            createdAt: new Date().toISOString(),
            checkIns: {} // { 'dateString': true }
        };
        this.habits.push(habit);
        this.save();
        return habit;
    }

    deleteHabit(habitId) {
        this.habits = this.habits.filter(h => h.id !== habitId);
        this.save();
    }

    toggleCheckIn(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return false;
        const today = new Date().toDateString();
        if (habit.checkIns[today]) {
            delete habit.checkIns[today];
        } else {
            habit.checkIns[today] = true;
        }
        this.save();
        return habit.checkIns[today];
    }

    isCheckedToday(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return false;
        return !!habit.checkIns[new Date().toDateString()];
    }

    getStreak(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return 0;
        let streak = 0;
        let checkDate = new Date();
        while (habit.checkIns[checkDate.toDateString()]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return streak;
    }

    getBestStreak() {
        let best = 0;
        for (const habit of this.habits) {
            let streak = 0;
            let checkDate = new Date();
            while (habit.checkIns[checkDate.toDateString()]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
            if (streak > best) best = streak;
        }
        return best;
    }

    getTodayDoneCount() {
        const today = new Date().toDateString();
        return this.habits.filter(h => h.checkIns[today]).length;
    }
}

// ==================== 目标管理 ====================

class GoalManager {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('gamified-life-goals');
        this.goals = saved ? JSON.parse(saved) : [];
    }

    save() {
        localStorage.setItem('gamified-life-goals', JSON.stringify(this.goals));
    }

    addGoal(name, motivation, deadline) {
        const goal = {
            id: Date.now().toString(),
            name,
            motivation: motivation || '',
            deadline: deadline || '',
            tasks: [],
            createdAt: new Date().toISOString()
        };
        this.goals.push(goal);
        this.save();
        return goal;
    }

    deleteGoal(goalId) {
        this.goals = this.goals.filter(g => g.id !== goalId);
        this.save();
    }

    addTask(goalId, taskName) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return null;
        const task = {
            id: Date.now().toString(),
            name: taskName,
            done: false,
            createdAt: new Date().toISOString()
        };
        goal.tasks.push(task);
        this.save();
        return task;
    }

    deleteTask(goalId, taskId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        goal.tasks = goal.tasks.filter(t => t.id !== taskId);
        this.save();
    }

    toggleTask(goalId, taskId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return false;
        const task = goal.tasks.find(t => t.id === taskId);
        if (!task) return false;
        task.done = !task.done;
        this.save();
        return task.done;
    }

    getProgress(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal || goal.tasks.length === 0) return 0;
        const done = goal.tasks.filter(t => t.done).length;
        return Math.round((done / goal.tasks.length) * 100);
    }

    isCompleted(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal || goal.tasks.length === 0) return false;
        return goal.tasks.every(t => t.done);
    }

    // 获取今日聚焦任务：未完成的目标中的未完成任务
    getFocusTasks() {
        const focusTasks = [];
        for (const goal of this.goals) {
            if (this.isCompleted(goal.id)) continue;
            for (const task of goal.tasks) {
                if (!task.done) {
                    focusTasks.push({
                        taskId: task.id,
                        taskName: task.name,
                        goalId: goal.id,
                        goalName: goal.name
                    });
                }
            }
        }
        // 最多返回5个聚焦任务
        return focusTasks.slice(0, 5);
    }

    // 统计
    getStats() {
        const tracking = this.goals.length;
        const completed = this.goals.filter(g => this.isCompleted(g.id)).length;
        const inProgress = tracking - completed;
        return { tracking, inProgress, completed };
    }
}

// ==================== 财务管理 ====================

class FinanceManager {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('gamified-life-finance');
        if (saved) {
            const data = JSON.parse(saved);
            this.records = data.records ?? [];
            this.settings = data.settings ?? { balance: 0 };
        } else {
            this.records = [];
            this.settings = { balance: 0 };
        }
    }

    save() {
        localStorage.setItem('gamified-life-finance', JSON.stringify({
            records: this.records,
            settings: this.settings
        }));
    }

    addRecord(amount, category, note, type) {
        const record = {
            id: Date.now().toString(),
            amount: parseFloat(amount),
            category,
            note: note || '',
            type, // 'income' | 'expense'
            timestamp: new Date().toISOString()
        };

        if (type === 'income') {
            this.settings.balance += record.amount;
        } else {
            this.settings.balance -= record.amount;
        }

        this.records.unshift(record);
        this.save();
        return record;
    }

    getTodaySummary() {
        const today = new Date().toDateString();
        const todayRecords = this.records.filter(r => new Date(r.timestamp).toDateString() === today);
        let income = 0;
        let expense = 0;
        todayRecords.forEach(r => {
            if (r.type === 'income') income += r.amount;
            else expense += r.amount;
        });
        return { income, expense };
    }

    getMonthSummary() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthRecords = this.records.filter(r => new Date(r.timestamp) >= monthStart);
        let income = 0;
        let expense = 0;
        monthRecords.forEach(r => {
            if (r.type === 'income') income += r.amount;
            else expense += r.amount;
        });
        return { income, expense };
    }

    getBalance() {
        return this.settings.balance;
    }

    // 获取本月每日收支数据（用于图表）
    getMonthDailyData() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = now.getDate();

        const dailyData = [];
        for (let d = 1; d <= today; d++) {
            const dateStr = new Date(year, month, d).toDateString();
            const dayRecords = this.records.filter(r => new Date(r.timestamp).toDateString() === dateStr);
            let income = 0;
            let expense = 0;
            dayRecords.forEach(r => {
                if (r.type === 'income') income += r.amount;
                else expense += r.amount;
            });
            dailyData.push({
                day: d,
                label: `${d}`,
                income,
                expense
            });
        }
        return dailyData;
    }

    // 获取本月分类占比
    getCategoryBreakdown() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthRecords = this.records.filter(r => new Date(r.timestamp) >= monthStart && r.type === 'expense');

        const categories = {};
        monthRecords.forEach(r => {
            categories[r.category] = (categories[r.category] || 0) + r.amount;
        });

        return Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => ({ category, amount }));
    }
}

// ==================== 状态评估引擎 ====================

class StateEvaluator {
    static evaluateEnergy(value) {
        if (value >= 80) return THRESHOLDS.energy.excellent;
        if (value >= 50) return THRESHOLDS.energy.normal;
        if (value >= 20) return THRESHOLDS.energy.tired;
        return THRESHOLDS.energy.exhausted;
    }

    static evaluateMental(value) {
        if (value >= 70) return THRESHOLDS.mental.positive;
        if (value >= 40) return THRESHOLDS.mental.normal;
        return THRESHOLDS.mental.low;
    }

    static getAlert(state) {
        const alerts = [];
        if (state.energy < 20) alerts.push('体力严重不足！请立即休息恢复');
        else if (state.energy < 50) alerts.push('体力偏低，建议优先恢复');
        if (state.mental < 40) alerts.push('心理状态需要关注');
        return alerts.length > 0 ? alerts.join(' | ') : null;
    }
}

// ==================== 行动推荐引擎 ====================

class RecommendationEngine {
    static getRecommendations(state, focusTasks) {
        const recommendations = [];

        // 如果有未完成的聚焦任务，优先推荐
        if (focusTasks && focusTasks.length > 0) {
            recommendations.push({
                action: `完成: ${focusTasks[0].taskName}`,
                reason: `目标: ${focusTasks[0].goalName}`,
                category: '成长',
                icon: '🎯',
                id: 'focus-task',
                isFocus: true
            });
        }

        if (state.energy < 20) {
            recommendations.push(
                { action: '小睡15分钟', reason: '恢复体力', category: '恢复', icon: '😴', id: 'nap' },
                { action: '冥想10分钟', reason: '放松身心', category: '恢复', icon: '🧘', id: 'meditate' }
            );
        } else if (state.energy < 50) {
            recommendations.push(
                { action: '散步20分钟', reason: '轻度恢复', category: '恢复', icon: '🚶', id: 'walk' },
                { action: '规律三餐', reason: '补充能量', category: '维持', icon: '🍽️', id: 'meal' },
                { action: '阅读30分钟', reason: '低消耗成长', category: '成长', icon: '📚', id: 'read' }
            );
        } else if (state.energy < 80) {
            recommendations.push(
                { action: '完成一项工作', reason: '利用良好状态', category: '成长', icon: '✅', id: 'work' },
                { action: '学习新技能1小时', reason: '持续提升', category: '成长', icon: '📖', id: 'learn' },
                { action: '运动健身', reason: '增强体质', category: '成长', icon: '💪', id: 'exercise' }
            );
        } else {
            recommendations.push(
                { action: '运动健身', reason: '充沛体力，适合运动', category: '成长', icon: '💪', id: 'exercise' },
                { action: '外出社交活动', reason: '利用好状态社交', category: '社交', icon: '🎉', id: 'social' },
                { action: '学习新技能1小时', reason: '高效学习时间', category: '成长', icon: '📖', id: 'learn' }
            );
        }
        if (state.mental < 40) {
            recommendations.unshift(
                { action: '冥想10分钟', reason: '改善心理状态', category: '恢复', icon: '🧘', id: 'meditate' },
                { action: '主动联系朋友', reason: '获得情感支持', category: '社交', icon: '📱', id: 'contact' }
            );
        }
        return recommendations.slice(0, 4);
    }
}

// ==================== 时段感知 ====================

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return { text: '新的一天', sub: '今天想做什么？' };
    if (hour >= 12 && hour < 18) return { text: '下午好', sub: '保持节奏' };
    if (hour >= 18 && hour < 23) return { text: '晚上好', sub: '来做个回顾吧' };
    return { text: '夜深了', sub: '该休息了' };
}

// ==================== 每日回顾管理 ====================

class ReviewManager {
    constructor() {
        this.load();
    }

    load() {
        const saved = localStorage.getItem('gamified-life-reviews');
        this.reviews = saved ? JSON.parse(saved) : {};
    }

    save() {
        localStorage.setItem('gamified-life-reviews', JSON.stringify(this.reviews));
    }

    hasTodayReview() {
        const today = new Date().toDateString();
        return !!this.reviews[today];
    }

    saveReview(data) {
        const today = new Date().toDateString();
        this.reviews[today] = {
            ...data,
            timestamp: new Date().toISOString()
        };
        this.save();
    }

    shouldShowReview() {
        // 当天第一次打开且时间>18点
        const hour = new Date().getHours();
        if (hour < 18) return false;
        if (this.hasTodayReview()) return false;
        return true;
    }
}

// ==================== UI 控制器 ====================

class UIController {
    constructor(gameState, habitManager, goalManager, financeManager, reviewManager) {
        this.state = gameState;
        this.habits = habitManager;
        this.goals = goalManager;
        this.finance = financeManager;
        this.reviews = reviewManager;
        this.currentTab = 'home';
        this.selectedHabitIcon = '💧';
        this.confirmCallback = null;
        this.financeType = 'expense';
        this.financeCategory = '餐饮';
        this.addingTaskGoalId = null;
        this.init();
    }

    init() {
        this.bindTabBar();
        this.bindHomeEvents();
        this.bindActionEvents();
        this.bindHabitEvents();
        this.bindGoalEvents();
        this.bindFinanceEvents();
        this.bindReviewEvents();
        this.bindModalEvents();
        this.renderAll();

        // 应用财务对心理的联动
        this.applyFinanceMentalEffect();

        // 检查是否需要弹出每日回顾
        if (this.reviews.shouldShowReview()) {
            setTimeout(() => this.openReviewModal(), 800);
        }
    }

    // ========== 财务联动心理 ==========
    applyFinanceMentalEffect() {
        const balance = this.finance.getBalance();
        // 仅在首次加载时应用，不重复叠加
        // 存储上次应用的余额，避免每次刷新都叠加
        const lastAppliedBalance = parseFloat(sessionStorage.getItem('finance-mental-applied') || '0');
        if (lastAppliedBalance === balance) return;

        // 计算差值
        let mentalDelta = 0;
        if (balance > 5000) mentalDelta = 5;
        else if (balance < 0) mentalDelta = -10;
        else if (balance < 1000) mentalDelta = -5;

        if (mentalDelta !== 0) {
            this.state.mental = Math.max(0, Math.min(100, this.state.mental + mentalDelta));
            this.state.save();
        }
        sessionStorage.setItem('finance-mental-applied', balance.toString());
    }

    // ========== Tab 切换 ==========
    bindTabBar() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        // 更新Tab高亮
        document.querySelectorAll('.tab-item').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        // 切换页面
        document.querySelectorAll('.tab-page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${tabName}`);
        });
        // 渲染对应页面
        this.renderTabPage(tabName);
    }

    renderTabPage(tabName) {
        switch (tabName) {
            case 'home': this.renderHome(); break;
            case 'action': this.renderActionPage(); break;
            case 'habit': this.renderHabitPage(); break;
            case 'data': this.renderDataPage(); break;
        }
    }

    renderAll() {
        this.renderHome();
        this.renderActionPage();
        this.renderHabitPage();
        this.renderDataPage();
    }

    // ========== 总览页 ==========
    bindHomeEvents() {
        document.getElementById('record-btn').addEventListener('click', () => this.openActionModal());
        document.getElementById('finance-quick-add-btn').addEventListener('click', () => this.openFinanceModal());
    }

    renderHome() {
        this.renderGreeting();
        this.renderStats();
        this.renderAlert();
        this.renderFinanceOverview();
        this.renderDailyFocus();
        this.renderRecommendations();
    }

    renderGreeting() {
        const greeting = getGreeting();
        document.getElementById('greeting-text').textContent = greeting.text;
        document.getElementById('greeting-sub').textContent = greeting.sub;
    }

    renderStats() {
        const energyEl = document.getElementById('energy-value');
        const energyBar = document.getElementById('energy-bar');
        const energyStatus = document.getElementById('energy-status');
        const energyCard = document.getElementById('energy-card');

        energyEl.textContent = `${this.state.energy}/100`;
        energyBar.style.width = `${this.state.energy}%`;
        const energyEval = StateEvaluator.evaluateEnergy(this.state.energy);
        energyStatus.textContent = `状态：${energyEval.label}`;
        energyCard.className = 'stat-card';
        if (this.state.energy < 20) energyCard.classList.add('danger');
        else if (this.state.energy < 50) energyCard.classList.add('warning');

        const mentalEl = document.getElementById('mental-value');
        const mentalBar = document.getElementById('mental-bar');
        const mentalStatus = document.getElementById('mental-status');
        const mentalCard = document.getElementById('mental-card');

        mentalEl.textContent = `${this.state.mental}/100`;
        mentalBar.style.width = `${this.state.mental}%`;
        const mentalEval = StateEvaluator.evaluateMental(this.state.mental);
        mentalStatus.textContent = `状态：${mentalEval.label}`;
        mentalCard.className = 'stat-card';
        if (this.state.mental < 40) mentalCard.classList.add('warning');

        document.getElementById('charm-value').textContent = this.state.charm;
    }

    renderAlert() {
        const alertBox = document.getElementById('alert-box');
        const alertText = document.getElementById('alert-text');
        const alert = StateEvaluator.getAlert(this.state);
        if (alert) {
            alertText.textContent = alert;
            alertBox.style.display = 'flex';
        } else {
            alertBox.style.display = 'none';
        }
    }

    renderFinanceOverview() {
        const summary = this.finance.getTodaySummary();
        const balance = this.finance.getBalance();
        document.getElementById('finance-today-income').textContent = `+${summary.income.toFixed(2)}`;
        document.getElementById('finance-today-expense').textContent = `-${summary.expense.toFixed(2)}`;
        document.getElementById('finance-balance').textContent = balance.toFixed(2);
    }

    renderDailyFocus() {
        const container = document.getElementById('daily-focus-list');
        const focusTasks = this.goals.getFocusTasks();

        if (focusTasks.length === 0) {
            container.innerHTML = '<div class="daily-focus-empty">暂无聚焦任务，在习惯页添加目标开始吧</div>';
            return;
        }

        container.innerHTML = focusTasks.map(ft => {
            const task = this.findTask(ft.goalId, ft.taskId);
            const isDone = task ? task.done : false;
            return `
                <div class="daily-focus-item ${isDone ? 'done' : ''}" data-goal-id="${ft.goalId}" data-task-id="${ft.taskId}">
                    <div class="daily-focus-check" data-goal-id="${ft.goalId}" data-task-id="${ft.taskId}">${isDone ? '✓' : ''}</div>
                    <span class="daily-focus-task-name">${ft.taskName}</span>
                    <span class="daily-focus-goal-name">${ft.goalName}</span>
                </div>
            `;
        }).join('');

        // 绑定勾选事件
        container.querySelectorAll('.daily-focus-check').forEach(check => {
            check.addEventListener('click', (e) => {
                e.stopPropagation();
                const goalId = check.dataset.goalId;
                const taskId = check.dataset.taskId;
                this.goals.toggleTask(goalId, taskId);
                this.renderDailyFocus();
                this.renderGoals();
            });
        });
    }

    findTask(goalId, taskId) {
        const goal = this.goals.goals.find(g => g.id === goalId);
        if (!goal) return null;
        return goal.tasks.find(t => t.id === taskId);
    }

    renderRecommendations() {
        const container = document.getElementById('rec-list');
        const focusTasks = this.goals.getFocusTasks();
        const recommendations = RecommendationEngine.getRecommendations(this.state, focusTasks);
        container.innerHTML = recommendations.map(rec => `
            <div class="rec-item" data-action-id="${rec.id}" ${rec.isFocus ? `data-focus-goal-id="${focusTasks[0]?.goalId}" data-focus-task-id="${focusTasks[0]?.taskId}"` : ''}>
                <span class="rec-icon">${rec.icon}</span>
                <span class="rec-text">${rec.action} - ${rec.reason}</span>
                <span class="rec-tag ${rec.category}">${rec.category}</span>
            </div>
        `).join('');

        container.querySelectorAll('.rec-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.focusGoalId) {
                    // 聚焦任务：直接标记完成
                    this.goals.toggleTask(item.dataset.focusGoalId, item.dataset.focusTaskId);
                    this.renderAll();
                } else {
                    this.performAction(item.dataset.actionId);
                }
            });
        });
    }

    // ========== 行动页 ==========
    bindActionEvents() {
        document.getElementById('record-btn-2').addEventListener('click', () => this.openActionModal());
    }

    renderActionPage() {
        const todayHistory = this.state.getTodayHistory();
        document.getElementById('today-action-count').textContent = `今日 ${todayHistory.length} 次行动`;

        // 今日行动列表
        const todayList = document.getElementById('action-today-list');
        if (todayHistory.length === 0) {
            todayList.innerHTML = '<div class="empty-state"><p>今天还没有记录行动</p></div>';
        } else {
            todayList.innerHTML = todayHistory.map(h => this.renderHistoryItem(h)).join('');
        }

        // 最近7天
        const weekHistory = this.state.getWeekHistory();
        const weekList = document.getElementById('action-week-list');
        const todayStr = new Date().toDateString();
        const weekExceptToday = weekHistory.filter(h => new Date(h.timestamp).toDateString() !== todayStr);
        if (weekExceptToday.length === 0) {
            weekList.innerHTML = '<div class="empty-state"><p>暂无更多记录</p></div>';
        } else {
            weekList.innerHTML = weekExceptToday.slice(0, 20).map(h => this.renderHistoryItem(h)).join('');
        }
    }

    renderHistoryItem(h) {
        const date = new Date(h.timestamp);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = isToday ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            : isYesterday ? `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
            : `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;

        const changes = [];
        if (h.changes.energy !== 0) changes.push(`${h.changes.energy > 0 ? '+' : ''}${h.changes.energy}体`);
        if (h.changes.mental !== 0) changes.push(`${h.changes.mental > 0 ? '+' : ''}${h.changes.mental}心`);
        if (h.changes.charm !== 0) changes.push(`+${h.changes.charm}魅`);

        return `
            <div class="history-item">
                <span class="history-time">${timeStr}</span>
                <span class="history-action">${h.actionName}</span>
                <span class="history-changes">${changes.join(' ')}</span>
            </div>
        `;
    }

    // ========== 习惯页 ==========
    bindHabitEvents() {
        document.getElementById('add-habit-btn').addEventListener('click', () => {
            document.getElementById('habit-name-input').value = '';
            this.selectedHabitIcon = '💧';
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            document.querySelector('.icon-option[data-icon="💧"]').classList.add('selected');
            this.openModal('habit-modal');
        });

        document.getElementById('save-habit-btn').addEventListener('click', () => {
            const name = document.getElementById('habit-name-input').value.trim();
            if (!name) {
                document.getElementById('habit-name-input').style.borderColor = 'var(--danger)';
                setTimeout(() => document.getElementById('habit-name-input').style.borderColor = '', 1500);
                return;
            }
            this.habits.addHabit(name, this.selectedHabitIcon);
            this.closeModal('habit-modal');
            this.renderHabitPage();
        });

        // 图标选择
        document.querySelectorAll('.icon-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedHabitIcon = opt.dataset.icon;
            });
        });
    }

    renderHabitPage() {
        const habits = this.habits.habits;
        document.getElementById('habit-total').textContent = habits.length;
        document.getElementById('habit-done-today').textContent = this.habits.getTodayDoneCount();
        document.getElementById('habit-best-streak').textContent = this.habits.getBestStreak();

        const container = document.getElementById('habit-list');
        if (habits.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>还没有追踪任何习惯</p><p>点击下方"添加习惯"开始吧</p></div>';
        } else {
            container.innerHTML = habits.map(habit => {
                const checked = this.habits.isCheckedToday(habit.id);
                const streak = this.habits.getStreak(habit.id);
                return `
                    <div class="habit-item ${checked ? 'checked' : ''}" data-habit-id="${habit.id}">
                        <div class="habit-check" data-habit-id="${habit.id}">${checked ? '✓' : ''}</div>
                        <div class="habit-info">
                            <div class="habit-name">${habit.icon} ${habit.name}</div>
                            <div class="habit-streak">${streak > 0 ? `连续 <span>${streak}</span> 天` : '尚未开始'}</div>
                        </div>
                        <button class="habit-delete" data-habit-id="${habit.id}" title="删除习惯">✕</button>
                    </div>
                `;
            }).join('');

            // 绑定打卡事件
            container.querySelectorAll('.habit-check').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const habitId = btn.dataset.habitId;
                    this.habits.toggleCheckIn(habitId);
                    this.renderHabitPage();
                });
            });

            // 绑定删除事件
            container.querySelectorAll('.habit-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const habitId = btn.dataset.habitId;
                    const habit = this.habits.habits.find(h => h.id === habitId);
                    this.showConfirm(`删除习惯"${habit.name}"？`, '删除后打卡记录将无法恢复', () => {
                        this.habits.deleteHabit(habitId);
                        this.renderHabitPage();
                    });
                });
            });
        }

        // 渲染目标
        this.renderGoals();
    }

    // ========== 目标管理 ==========
    bindGoalEvents() {
        // 添加目标
        document.getElementById('add-goal-btn').addEventListener('click', () => {
            document.getElementById('goal-name-input').value = '';
            document.getElementById('goal-motivation-input').value = '';
            document.getElementById('goal-deadline-input').value = '';
            this.openModal('goal-modal');
        });

        document.getElementById('save-goal-btn').addEventListener('click', () => {
            const name = document.getElementById('goal-name-input').value.trim();
            if (!name) {
                document.getElementById('goal-name-input').style.borderColor = 'var(--danger)';
                setTimeout(() => document.getElementById('goal-name-input').style.borderColor = '', 1500);
                return;
            }
            const motivation = document.getElementById('goal-motivation-input').value.trim();
            const deadline = document.getElementById('goal-deadline-input').value;
            this.goals.addGoal(name, motivation, deadline);
            this.closeModal('goal-modal');
            this.renderGoals();
        });

        // 添加任务
        document.getElementById('save-task-btn').addEventListener('click', () => {
            const name = document.getElementById('task-name-input').value.trim();
            const goalId = document.getElementById('task-goal-select').value;
            if (!name) {
                document.getElementById('task-name-input').style.borderColor = 'var(--danger)';
                setTimeout(() => document.getElementById('task-name-input').style.borderColor = '', 1500);
                return;
            }
            if (!goalId) {
                document.getElementById('task-goal-select').style.borderColor = 'var(--danger)';
                setTimeout(() => document.getElementById('task-goal-select').style.borderColor = '', 1500);
                return;
            }
            this.goals.addTask(goalId, name);
            this.closeModal('task-modal');
            this.renderGoals();
            this.renderDailyFocus();
        });
    }

    renderGoals() {
        const stats = this.goals.getStats();
        document.getElementById('goal-tracking').textContent = stats.tracking;
        document.getElementById('goal-in-progress').textContent = stats.inProgress;
        document.getElementById('goal-completed').textContent = stats.completed;

        const container = document.getElementById('goals-list');
        const goals = this.goals.goals;

        if (goals.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>还没有设定任何目标</p><p>点击"添加目标"开始规划吧</p></div>';
            return;
        }

        container.innerHTML = goals.map(goal => {
            const progress = this.goals.getProgress(goal.id);
            const isCompleted = this.goals.isCompleted(goal.id);
            const deadlineStr = goal.deadline ? this.formatDeadline(goal.deadline) : '';

            return `
                <div class="goal-card ${isCompleted ? 'completed' : ''}" data-goal-id="${goal.id}">
                    <div class="goal-card-header">
                        <span class="goal-card-name">${isCompleted ? '✅ ' : ''}${goal.name}</span>
                        <button class="goal-card-delete" data-goal-id="${goal.id}" title="删除目标">✕</button>
                    </div>
                    ${goal.motivation ? `<div class="goal-card-motivation">"${goal.motivation}"</div>` : ''}
                    <div class="goal-card-meta">
                        ${deadlineStr ? `<span class="goal-card-deadline">📅 ${deadlineStr}</span>` : ''}
                        <span>${goal.tasks.length} 个任务</span>
                    </div>
                    <div class="goal-card-progress">
                        <div class="goal-progress-bar">
                            <div class="goal-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="goal-progress-text">${progress}%</span>
                    </div>
                    <div class="goal-card-tasks">
                        ${goal.tasks.map(task => `
                            <div class="goal-task-item ${task.done ? 'done' : ''}">
                                <div class="goal-task-check" data-goal-id="${goal.id}" data-task-id="${task.id}">${task.done ? '✓' : ''}</div>
                                <span class="goal-task-name">${task.name}</span>
                                <button class="goal-task-delete" data-goal-id="${goal.id}" data-task-id="${task.id}" title="删除任务">✕</button>
                            </div>
                        `).join('')}
                    </div>
                    ${!isCompleted ? `<button class="goal-add-task-btn" data-goal-id="${goal.id}">+ 添加任务</button>` : ''}
                </div>
            `;
        }).join('');

        // 绑定删除目标事件
        container.querySelectorAll('.goal-card-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const goalId = btn.dataset.goalId;
                const goal = this.goals.goals.find(g => g.id === goalId);
                this.showConfirm(`删除目标"${goal.name}"？`, '删除后所有任务也将被删除', () => {
                    this.goals.deleteGoal(goalId);
                    this.renderGoals();
                    this.renderDailyFocus();
                });
            });
        });

        // 绑定任务勾选事件
        container.querySelectorAll('.goal-task-check').forEach(check => {
            check.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goals.toggleTask(check.dataset.goalId, check.dataset.taskId);
                this.renderGoals();
                this.renderDailyFocus();
            });
        });

        // 绑定删除任务事件
        container.querySelectorAll('.goal-task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goals.deleteTask(btn.dataset.goalId, btn.dataset.taskId);
                this.renderGoals();
                this.renderDailyFocus();
            });
        });

        // 绑定添加任务按钮
        container.querySelectorAll('.goal-add-task-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openTaskModal(btn.dataset.goalId);
            });
        });
    }

    formatDeadline(dateStr) {
        const deadline = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `已过期 ${Math.abs(diffDays)} 天`;
        if (diffDays === 0) return '今天截止';
        if (diffDays === 1) return '明天截止';
        if (diffDays <= 7) return `${diffDays} 天后截止`;
        return `${deadline.getMonth() + 1}/${deadline.getDate()}`;
    }

    openTaskModal(goalId) {
        this.addingTaskGoalId = goalId;
        document.getElementById('task-name-input').value = '';

        // 填充目标选择
        const select = document.getElementById('task-goal-select');
        select.innerHTML = '<option value="">选择关联目标</option>';
        this.goals.goals.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            if (g.id === goalId) opt.selected = true;
            select.appendChild(opt);
        });

        this.openModal('task-modal');
    }

    // ========== 财务管理 ==========
    bindFinanceEvents() {
        // 收支类型切换
        document.querySelectorAll('.finance-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.finance-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.financeType = btn.dataset.type;
                this.updateFinanceCategoryGrid();
            });
        });

        // 分类选择
        document.querySelectorAll('.finance-cat-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.finance-cat-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.financeCategory = opt.dataset.category;
            });
        });

        // 保存记录
        document.getElementById('save-finance-btn').addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('finance-amount-input').value);
            if (!amount || amount <= 0) {
                document.getElementById('finance-amount-input').style.borderColor = 'var(--danger)';
                setTimeout(() => document.getElementById('finance-amount-input').style.borderColor = '', 1500);
                return;
            }
            const note = document.getElementById('finance-note-input').value.trim();
            this.finance.addRecord(amount, this.financeCategory, note, this.financeType);
            this.closeModal('finance-modal');
            document.getElementById('finance-amount-input').value = '';
            document.getElementById('finance-note-input').value = '';

            // 重新应用财务联动
            sessionStorage.removeItem('finance-mental-applied');
            this.applyFinanceMentalEffect();

            this.renderAll();
        });
    }

    updateFinanceCategoryGrid() {
        const grid = document.getElementById('finance-category-grid');
        if (this.financeType === 'income') {
            grid.innerHTML = '<div class="finance-cat-option selected" data-category="收入">💰<span>收入</span></div>';
        } else {
            grid.innerHTML = `
                <div class="finance-cat-option selected" data-category="餐饮">🍽️<span>餐饮</span></div>
                <div class="finance-cat-option" data-category="交通">🚌<span>交通</span></div>
                <div class="finance-cat-option" data-category="购物">🛒<span>购物</span></div>
                <div class="finance-cat-option" data-category="娱乐">🎮<span>娱乐</span></div>
                <div class="finance-cat-option" data-category="其他">📌<span>其他</span></div>
            `;
        }
        this.financeCategory = grid.querySelector('.finance-cat-option.selected')?.dataset.category || '餐饮';

        // 重新绑定分类选择事件
        grid.querySelectorAll('.finance-cat-option').forEach(opt => {
            opt.addEventListener('click', () => {
                grid.querySelectorAll('.finance-cat-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.financeCategory = opt.dataset.category;
            });
        });
    }

    openFinanceModal() {
        this.financeType = 'expense';
        this.financeCategory = '餐饮';
        document.querySelectorAll('.finance-type-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.finance-type-btn[data-type="expense"]').classList.add('active');
        this.updateFinanceCategoryGrid();
        document.getElementById('finance-amount-input').value = '';
        document.getElementById('finance-note-input').value = '';
        this.openModal('finance-modal');
    }

    // ========== 每日回顾 ==========
    bindReviewEvents() {
        // 滑块实时更新
        document.getElementById('review-energy-slider').addEventListener('input', (e) => {
            document.getElementById('review-energy-value').textContent = e.target.value;
        });
        document.getElementById('review-mental-slider').addEventListener('input', (e) => {
            document.getElementById('review-mental-value').textContent = e.target.value;
        });

        // 保存回顾
        document.getElementById('save-review-btn').addEventListener('click', () => {
            const data = {
                best: document.getElementById('review-best-input').value.trim(),
                energy: parseInt(document.getElementById('review-energy-slider').value),
                mental: parseInt(document.getElementById('review-mental-slider').value),
                plan: document.getElementById('review-plan-input').value.trim()
            };
            this.reviews.saveReview(data);

            // 用回顾数据更新状态
            this.state.energy = data.energy;
            this.state.mental = data.mental;
            this.state.save();

            this.closeModal('review-modal');
            this.renderAll();
        });
    }

    openReviewModal() {
        document.getElementById('review-best-input').value = '';
        document.getElementById('review-energy-slider').value = this.state.energy;
        document.getElementById('review-energy-value').textContent = this.state.energy;
        document.getElementById('review-mental-slider').value = this.state.mental;
        document.getElementById('review-mental-value').textContent = this.state.mental;
        document.getElementById('review-plan-input').value = '';
        this.openModal('review-modal');
    }

    // ========== 数据统计页 ==========
    renderDataPage() {
        const history = this.state.history;

        // 总览数据
        document.getElementById('data-total-actions').textContent = history.length;
        document.getElementById('data-streak').textContent = this.state.getUsageStreak();

        // 最常行动
        if (history.length > 0) {
            const counts = {};
            history.forEach(h => { counts[h.actionName] = (counts[h.actionName] || 0) + 1; });
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            document.getElementById('data-top-action').textContent = top[0];
        } else {
            document.getElementById('data-top-action').textContent = '-';
        }

        // 近7天行动趋势（柱状图）
        this.renderWeekChart();

        // 行动分类分布
        this.renderCategoryChart();

        // 数值变化趋势
        this.renderStatsChart();

        // 财务统计
        this.renderFinanceStats();
    }

    renderWeekChart() {
        const container = document.getElementById('chart-week');
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toDateString();
            const dayLabel = d.toLocaleDateString('zh-CN', { weekday: 'short' });
            const count = this.state.history.filter(h => new Date(h.timestamp).toDateString() === dateStr).length;
            days.push({ label: dayLabel, count });
        }

        const maxCount = Math.max(...days.map(d => d.count), 1);

        container.innerHTML = `
            <div class="bar-chart">
                ${days.map(d => `
                    <div class="bar-col">
                        <div class="bar-value">${d.count}</div>
                        <div class="bar-fill" style="height: ${Math.max((d.count / maxCount) * 100, 4)}%"></div>
                        <div class="bar-label">${d.label}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCategoryChart() {
        const container = document.getElementById('chart-category');
        const counts = {};
        this.state.history.forEach(h => {
            counts[h.actionCategory] = (counts[h.actionCategory] || 0) + 1;
        });

        const categories = ['恢复', '维持', '成长', '社交'];
        const colors = { '恢复': '#22c55e', '维持': '#3b82f6', '成长': '#6366f1', '社交': '#a78bfa' };
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

        if (total <= 1) {
            container.innerHTML = '<div class="empty-state"><p>记录更多行动后显示分布</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="category-chart">
                ${categories.map(cat => {
                    const count = counts[cat] || 0;
                    const pct = (count / total * 100).toFixed(0);
                    return `
                        <div class="category-row">
                            <span class="category-row-label">${cat}</span>
                            <div class="category-row-bar">
                                <div class="category-row-fill" style="width: ${pct}%; background: ${colors[cat]}"></div>
                            </div>
                            <span class="category-row-count">${count}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderStatsChart() {
        const container = document.getElementById('chart-stats');
        const snapshots = this.state.dailySnapshots;
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toDateString());
        }

        const energyData = dates.map(d => snapshots[d]?.energy ?? null);
        const mentalData = dates.map(d => snapshots[d]?.mental ?? null);

        // 如果没有快照数据，显示提示
        const hasData = energyData.some(v => v !== null) || mentalData.some(v => v !== null);
        if (!hasData) {
            container.innerHTML = '<div class="empty-state"><p>使用一天后显示数值趋势</p></div>';
            return;
        }

        const labels = dates.map(d => {
            const date = new Date(d);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        container.innerHTML = `
            <div class="stats-chart">
                <div class="stats-line">
                    <span class="stats-line-label">⚡ 体力</span>
                    <div class="stats-line-dots">
                        ${energyData.map((v, i) => `
                            <div style="flex:1; text-align:center;">
                                <div class="stats-dot energy" style="opacity: ${v !== null ? 1 : 0.2}; width: ${v !== null ? Math.max(v / 10, 6) : 6}px; height: ${v !== null ? Math.max(v / 10, 6) : 6}px;" title="${labels[i]}: ${v ?? '-'}"></div>
                                <div style="font-size:0.5rem; color: var(--text-muted); margin-top:2px;">${v ?? '-'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="stats-line">
                    <span class="stats-line-label">🧠 心理</span>
                    <div class="stats-line-dots">
                        ${mentalData.map((v, i) => `
                            <div style="flex:1; text-align:center;">
                                <div class="stats-dot mental" style="opacity: ${v !== null ? 1 : 0.2}; width: ${v !== null ? Math.max(v / 10, 6) : 6}px; height: ${v !== null ? Math.max(v / 10, 6) : 6}px;" title="${labels[i]}: ${v ?? '-'}"></div>
                                <div style="font-size:0.5rem; color: var(--text-muted); margin-top:2px;">${v ?? '-'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div style="display:flex; justify-content:space-around; margin-top:4px;">
                    ${labels.map(l => `<span style="font-size:0.5rem; color:var(--text-muted); flex:1; text-align:center;">${l}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // ========== 财务统计图表 ==========
    renderFinanceStats() {
        const monthSummary = this.finance.getMonthSummary();
        document.getElementById('finance-month-income').textContent = `+${monthSummary.income.toFixed(2)}`;
        document.getElementById('finance-month-expense').textContent = `-${monthSummary.expense.toFixed(2)}`;

        // 收支趋势图
        this.renderFinanceChart();

        // 分类占比
        this.renderFinanceCategoryBreakdown();
    }

    renderFinanceChart() {
        const container = document.getElementById('chart-finance');
        const dailyData = this.finance.getMonthDailyData();

        if (dailyData.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>记录收支后显示趋势图</p></div>';
            return;
        }

        const maxVal = Math.max(
            ...dailyData.map(d => Math.max(d.income, d.expense)),
            1
        );

        // 只显示最近14天（避免太拥挤）
        const displayData = dailyData.slice(-14);

        container.innerHTML = `
            <div class="finance-bar-chart">
                ${displayData.map(d => `
                    <div class="finance-bar-group">
                        <div class="finance-bar-pair">
                            <div class="finance-bar income-bar" style="height: ${Math.max((d.income / maxVal) * 100, 3)}%" title="收入: ${d.income.toFixed(0)}"></div>
                            <div class="finance-bar expense-bar" style="height: ${Math.max((d.expense / maxVal) * 100, 3)}%" title="支出: ${d.expense.toFixed(0)}"></div>
                        </div>
                        <div class="finance-bar-label">${d.label}</div>
                    </div>
                `).join('')}
            </div>
            <div class="finance-chart-legend">
                <div class="finance-legend-item">
                    <div class="finance-legend-dot income"></div>
                    <span>收入</span>
                </div>
                <div class="finance-legend-item">
                    <div class="finance-legend-dot expense"></div>
                    <span>支出</span>
                </div>
            </div>
        `;
    }

    renderFinanceCategoryBreakdown() {
        const container = document.getElementById('finance-category-breakdown');
        const breakdown = this.finance.getCategoryBreakdown();

        if (breakdown.length === 0) {
            container.innerHTML = '';
            return;
        }

        const maxAmount = Math.max(...breakdown.map(b => b.amount), 1);

        container.innerHTML = `
            <div class="finance-breakdown-title">支出分类占比</div>
            ${breakdown.map(b => `
                <div class="finance-breakdown-row">
                    <span class="finance-breakdown-label">${b.category}</span>
                    <div class="finance-breakdown-bar">
                        <div class="finance-breakdown-fill" style="width: ${(b.amount / maxAmount * 100).toFixed(0)}%"></div>
                    </div>
                    <span class="finance-breakdown-amount">${b.amount.toFixed(0)}</span>
                </div>
            `).join('')}
        `;
    }

    // ========== 行动弹窗 ==========
    openActionModal() {
        const container = document.getElementById('action-categories');
        const categories = {};
        ACTION_LIBRARY.forEach(action => {
            if (!categories[action.category]) categories[action.category] = [];
            categories[action.category].push(action);
        });

        const categoryIcons = { '恢复': '🔋', '维持': '🔄', '成长': '📈', '社交': '👥' };

        container.innerHTML = Object.entries(categories).map(([category, actions]) => {
            const actionItems = actions.map(action => {
                const limit = this.state.getActionLimit(action.id);
                const isDisabled = action.energy < 0 && this.state.energy + action.energy < 0;
                const limitText = limit ? `(${limit.used}/${limit.limit})` : '';
                const effects = [];
                if (action.energy !== 0) effects.push(`${action.energy > 0 ? '+' : ''}${action.energy}体力`);
                if (action.mental !== 0) effects.push(`${action.mental > 0 ? '+' : ''}${action.mental}心理`);
                if (action.charm !== 0) effects.push(`+${action.charm}魅力`);

                return `
                    <div class="action-item ${isDisabled ? 'disabled' : ''}" data-action-id="${action.id}">
                        <div class="action-info">
                            <span class="action-name">${action.icon} ${action.name} ${limitText}</span>
                            <span class="action-effect">
                                ${effects.map(e => {
                                    const isPos = e.includes('+');
                                    return `<span class="${isPos ? 'positive' : 'negative'}">${e}</span>`;
                                }).join(' ')}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="category">
                    <div class="category-title">${categoryIcons[category]} ${category}类</div>
                    <div class="action-list">${actionItems}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.action-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', () => this.performAction(item.dataset.actionId));
        });

        this.openModal('action-modal');
    }

    performAction(actionId) {
        const record = this.state.performAction(actionId);
        if (!record) return;
        this.closeModal('action-modal');
        this.showFeedback(record);
        this.renderAll();
    }

    showFeedback(record) {
        const changesContainer = document.getElementById('feedback-changes');
        const messageEl = document.getElementById('feedback-message');

        const changes = [];
        if (record.changes.energy !== 0) changes.push({ icon: '⚡', name: '体力', value: record.changes.energy, current: record.after.energy });
        if (record.changes.mental !== 0) changes.push({ icon: '🧠', name: '心理', value: record.changes.mental, current: record.after.mental });
        if (record.changes.charm !== 0) changes.push({ icon: '✨', name: '魅力', value: record.changes.charm, current: record.after.charm });

        changesContainer.innerHTML = changes.map(c => `
            <div class="change-item">
                <span class="change-icon">${c.icon}</span>
                <span>${c.name}</span>
                <span class="change-value ${c.value > 0 ? 'positive' : 'negative'}">${c.value > 0 ? '+' : ''}${c.value}</span>
                <span>→ ${c.current}</span>
            </div>
        `).join('');

        const messages = [
            '继续保持！每一步都是进步',
            '行动改变状态，状态驱动行动',
            '你在变得更好，这很棒',
            '记录即开始，坚持即胜利',
            '今天的行动是明天的基础'
        ];
        messageEl.textContent = messages[Math.floor(Math.random() * messages.length)];
        this.openModal('feedback-modal');
    }

    // ========== 确认弹窗 ==========
    showConfirm(title, text, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-text').textContent = text;
        this.confirmCallback = callback;
        this.openModal('confirm-modal');
    }

    // ========== 弹窗通用 ==========
    bindModalEvents() {
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal('action-modal'));
        document.getElementById('close-habit-modal').addEventListener('click', () => this.closeModal('habit-modal'));
        document.getElementById('close-goal-modal').addEventListener('click', () => this.closeModal('goal-modal'));
        document.getElementById('close-task-modal').addEventListener('click', () => this.closeModal('task-modal'));
        document.getElementById('close-finance-modal').addEventListener('click', () => this.closeModal('finance-modal'));
        document.getElementById('close-review-modal').addEventListener('click', () => this.closeModal('review-modal'));
        document.getElementById('feedback-ok').addEventListener('click', () => this.closeModal('feedback-modal'));
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeModal('confirm-modal'));
        document.getElementById('confirm-ok').addEventListener('click', () => {
            this.closeModal('confirm-modal');
            if (this.confirmCallback) {
                this.confirmCallback();
                this.confirmCallback = null;
            }
        });

        // 点击背景关闭
        ['action-modal', 'feedback-modal', 'habit-modal', 'confirm-modal', 'goal-modal', 'task-modal', 'finance-modal', 'review-modal'].forEach(id => {
            document.getElementById(id).addEventListener('click', (e) => {
                if (e.target.id === id) this.closeModal(id);
            });
        });
    }

    openModal(id) {
        document.getElementById(id).classList.add('active');
    }

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    const gameState = new GameState();
    const habitManager = new HabitManager();
    const goalManager = new GoalManager();
    const financeManager = new FinanceManager();
    const reviewManager = new ReviewManager();
    const ui = new UIController(gameState, habitManager, goalManager, financeManager, reviewManager);

    window.gameState = gameState;
    window.habitManager = habitManager;
    window.goalManager = goalManager;
    window.financeManager = financeManager;
    window.reviewManager = reviewManager;
    window.ui = ui;

    console.log('🎮 游戏化人生系统 v3 (Phase 3) 已启动');
});
