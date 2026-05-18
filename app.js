// ==================== 游戏化人生系统 v2 - 核心逻辑 ====================

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
    static getRecommendations(state) {
        const recommendations = [];
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

// ==================== UI 控制器 ====================

class UIController {
    constructor(gameState, habitManager) {
        this.state = gameState;
        this.habits = habitManager;
        this.currentTab = 'home';
        this.selectedHabitIcon = '💧';
        this.confirmCallback = null;
        this.init();
    }

    init() {
        this.bindTabBar();
        this.bindHomeEvents();
        this.bindActionEvents();
        this.bindHabitEvents();
        this.bindModalEvents();
        this.renderAll();
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
    }

    renderHome() {
        this.renderStats();
        this.renderAlert();
        this.renderRecommendations();
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

    renderRecommendations() {
        const container = document.getElementById('rec-list');
        const recommendations = RecommendationEngine.getRecommendations(this.state);
        container.innerHTML = recommendations.map(rec => `
            <div class="rec-item" data-action-id="${rec.id}">
                <span class="rec-icon">${rec.icon}</span>
                <span class="rec-text">${rec.action} - ${rec.reason}</span>
                <span class="rec-tag ${rec.category}">${rec.category}</span>
            </div>
        `).join('');

        container.querySelectorAll('.rec-item').forEach(item => {
            item.addEventListener('click', () => {
                this.performAction(item.dataset.actionId);
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
            return;
        }

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
        ['action-modal', 'feedback-modal', 'habit-modal', 'confirm-modal'].forEach(id => {
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
    const ui = new UIController(gameState, habitManager);

    window.gameState = gameState;
    window.habitManager = habitManager;
    window.ui = ui;

    console.log('🎮 游戏化人生系统 v2 已启动');
});
