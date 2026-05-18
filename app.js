// ==================== 游戏化人生系统 - 核心逻辑 ====================

// ==================== 数据定义 ====================

// 行动库
const ACTION_LIBRARY = [
    // 恢复类
    { id: 'nap', name: '小睡15分钟', category: '恢复', icon: '😴', energy: 15, mental: 5, charm: 0, dailyLimit: null },
    { id: 'walk', name: '散步20分钟', category: '恢复', icon: '🚶', energy: 10, mental: 10, charm: 0, dailyLimit: null },
    { id: 'meditate', name: '冥想10分钟', category: '恢复', icon: '🧘', energy: 5, mental: 15, charm: 0, dailyLimit: null },
    { id: 'early_sleep', name: '早睡(23点前)', category: '恢复', icon: '🌙', energy: 20, mental: 10, charm: 0, dailyLimit: 1 },
    
    // 维持类
    { id: 'meal', name: '规律三餐', category: '维持', icon: '🍽️', energy: 10, mental: 5, charm: 0, dailyLimit: 3 },
    { id: 'clean', name: '整理房间', category: '维持', icon: '🧹', energy: -5, mental: 10, charm: 0, dailyLimit: null },
    { id: 'grooming', name: '洗漱护理', category: '维持', icon: '🚿', energy: 0, mental: 5, charm: 1, dailyLimit: 2 },
    
    // 成长类
    { id: 'read', name: '阅读30分钟', category: '成长', icon: '📚', energy: -5, mental: 15, charm: 0, dailyLimit: null },
    { id: 'learn', name: '学习新技能1小时', category: '成长', icon: '📖', energy: -10, mental: 20, charm: 0, dailyLimit: null },
    { id: 'exercise', name: '运动健身', category: '成长', icon: '💪', energy: -15, mental: 15, charm: 1, dailyLimit: null },
    { id: 'work', name: '完成一项工作', category: '成长', icon: '✅', energy: -10, mental: 20, charm: 0, dailyLimit: null },
    
    // 社交类
    { id: 'contact', name: '主动联系朋友', category: '社交', icon: '📱', energy: -5, mental: 10, charm: 1, dailyLimit: null },
    { id: 'social', name: '外出社交活动', category: '社交', icon: '🎉', energy: -10, mental: 15, charm: 2, dailyLimit: null },
];

// 状态阈值配置
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
        } else {
            this.reset();
        }
        
        // 检查是否是新的一天
        const today = new Date().toDateString();
        if (this.lastDate !== today) {
            this.dailyCounts = {};
            this.lastDate = today;
            this.save();
        }
    }

    save() {
        const data = {
            energy: this.energy,
            mental: this.mental,
            charm: this.charm,
            history: this.history,
            dailyCounts: this.dailyCounts,
            lastDate: this.lastDate
        };
        localStorage.setItem('gamified-life-data', JSON.stringify(data));
    }

    reset() {
        this.energy = 75;
        this.mental = 62;
        this.charm = 5;
        this.history = [];
        this.dailyCounts = {};
        this.lastDate = new Date().toDateString();
        this.save();
    }

    // 执行行动
    performAction(actionId) {
        const action = ACTION_LIBRARY.find(a => a.id === actionId);
        if (!action) return null;

        // 检查每日限制
        if (action.dailyLimit) {
            const count = this.dailyCounts[actionId] || 0;
            if (count >= action.dailyLimit) {
                return null;
            }
        }

        // 检查体力是否足够（消耗体力的行动）
        if (action.energy < 0 && this.energy + action.energy < 0) {
            return null;
        }

        // 记录变化前状态
        const before = {
            energy: this.energy,
            mental: this.mental,
            charm: this.charm
        };

        // 应用变化
        this.energy = Math.max(0, Math.min(100, this.energy + action.energy));
        this.mental = Math.max(0, Math.min(100, this.mental + action.mental));
        this.charm = Math.max(0, this.charm + action.charm);

        // 记录历史
        const record = {
            id: Date.now(),
            actionId: action.id,
            actionName: action.name,
            timestamp: new Date().toISOString(),
            changes: {
                energy: action.energy,
                mental: action.mental,
                charm: action.charm
            },
            before,
            after: {
                energy: this.energy,
                mental: this.mental,
                charm: this.charm
            }
        };
        this.history.unshift(record);

        // 更新每日计数
        if (action.dailyLimit) {
            this.dailyCounts[actionId] = (this.dailyCounts[actionId] || 0) + 1;
        }

        this.save();
        return record;
    }

    // 获取今日记录
    getTodayHistory() {
        const today = new Date().toDateString();
        return this.history.filter(h => new Date(h.timestamp).toDateString() === today);
    }

    // 获取行动可用次数
    getActionLimit(actionId) {
        const action = ACTION_LIBRARY.find(a => a.id === actionId);
        if (!action || !action.dailyLimit) return null;
        const used = this.dailyCounts[actionId] || 0;
        return { used, limit: action.dailyLimit, remaining: action.dailyLimit - used };
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
        
        if (state.energy < 20) {
            alerts.push('体力严重不足！请立即休息恢复');
        } else if (state.energy < 50) {
            alerts.push('体力偏低，建议优先恢复');
        }

        if (state.mental < 40) {
            alerts.push('心理状态需要关注');
        }

        return alerts.length > 0 ? alerts.join(' | ') : null;
    }
}

// ==================== 行动推荐引擎 ====================

class RecommendationEngine {
    static getRecommendations(state) {
        const recommendations = [];
        
        // 根据体力状态推荐
        if (state.energy < 20) {
            // 透支状态：只推荐恢复
            recommendations.push(
                { action: '小睡15分钟', reason: '恢复体力', category: '恢复', icon: '😴' },
                { action: '冥想10分钟', reason: '放松身心', category: '恢复', icon: '🧘' }
            );
        } else if (state.energy < 50) {
            // 疲劳状态：优先恢复
            recommendations.push(
                { action: '散步20分钟', reason: '轻度恢复', category: '恢复', icon: '🚶' },
                { action: '规律三餐', reason: '补充能量', category: '维持', icon: '🍽️' },
                { action: '阅读30分钟', reason: '低消耗成长', category: '成长', icon: '📚' }
            );
        } else if (state.energy < 80) {
            // 正常状态：平衡推荐
            recommendations.push(
                { action: '完成一项工作', reason: '利用良好状态', category: '成长', icon: '✅' },
                { action: '学习新技能1小时', reason: '持续提升', category: '成长', icon: '📖' },
                { action: '运动健身', reason: '增强体质', category: '成长', icon: '💪' }
            );
        } else {
            // 充沛状态：挑战推荐
            recommendations.push(
                { action: '运动健身', reason: '充沛体力，适合运动', category: '成长', icon: '💪' },
                { action: '外出社交活动', reason: '利用好状态社交', category: '社交', icon: '🎉' },
                { action: '学习新技能1小时', reason: '高效学习时间', category: '成长', icon: '📖' }
            );
        }

        // 根据心理状态补充
        if (state.mental < 40) {
            recommendations.unshift(
                { action: '冥想10分钟', reason: '改善心理状态', category: '恢复', icon: '🧘' },
                { action: '主动联系朋友', reason: '获得情感支持', category: '社交', icon: '📱' }
            );
        }

        return recommendations.slice(0, 4); // 最多返回4条
    }
}

// ==================== UI 控制器 ====================

class UIController {
    constructor(gameState) {
        this.state = gameState;
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // 记录行动按钮
        document.getElementById('record-btn').addEventListener('click', () => {
            this.openActionModal();
        });

        // 历史记录按钮
        document.getElementById('history-btn').addEventListener('click', () => {
            this.openHistoryModal();
        });

        // 关闭弹窗
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeModal('action-modal');
        });

        document.getElementById('close-history').addEventListener('click', () => {
            this.closeModal('history-modal');
        });

        document.getElementById('feedback-ok').addEventListener('click', () => {
            this.closeModal('feedback-modal');
        });

        // 点击弹窗背景关闭
        ['action-modal', 'feedback-modal', 'history-modal'].forEach(id => {
            document.getElementById(id).addEventListener('click', (e) => {
                if (e.target.id === id) {
                    this.closeModal(id);
                }
            });
        });
    }

    render() {
        this.renderStats();
        this.renderAlert();
        this.renderRecommendations();
    }

    renderStats() {
        // 体力值
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

        // 心理状态值
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

        // 魅力值
        const charmEl = document.getElementById('charm-value');
        charmEl.textContent = this.state.charm;
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
            <div class="rec-item" data-action="${rec.action}">
                <span class="rec-icon">${rec.icon}</span>
                <span class="rec-text">${rec.action} - ${rec.reason}</span>
                <span class="rec-tag ${rec.category}">${rec.category}</span>
            </div>
        `).join('');
    }

    openActionModal() {
        const modal = document.getElementById('action-modal');
        const container = document.getElementById('action-categories');

        // 按分类组织行动
        const categories = {};
        ACTION_LIBRARY.forEach(action => {
            if (!categories[action.category]) {
                categories[action.category] = [];
            }
            categories[action.category].push(action);
        });

        // 分类图标
        const categoryIcons = {
            '恢复': '🔋',
            '维持': '🔄',
            '成长': '📈',
            '社交': '👥'
        };

        // 渲染分类和行动
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
                    <div class="action-item ${isDisabled ? 'disabled' : ''}" 
                         data-action-id="${action.id}"
                         ${isDisabled ? 'title="体力不足"' : ''}>
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
                    <div class="action-list">
                        ${actionItems}
                    </div>
                </div>
            `;
        }).join('');

        // 绑定行动点击事件
        container.querySelectorAll('.action-item:not(.disabled)').forEach(item => {
            item.addEventListener('click', () => {
                const actionId = item.dataset.actionId;
                this.performAction(actionId);
            });
        });

        modal.classList.add('active');
    }

    performAction(actionId) {
        const record = this.state.performAction(actionId);
        if (!record) return;

        this.closeModal('action-modal');
        this.showFeedback(record);
        this.render();
    }

    showFeedback(record) {
        const modal = document.getElementById('feedback-modal');
        const changesContainer = document.getElementById('feedback-changes');
        const messageEl = document.getElementById('feedback-message');

        const changes = [];
        if (record.changes.energy !== 0) {
            changes.push({
                icon: '⚡',
                name: '体力',
                value: record.changes.energy,
                current: record.after.energy
            });
        }
        if (record.changes.mental !== 0) {
            changes.push({
                icon: '🧠',
                name: '心理',
                value: record.changes.mental,
                current: record.after.mental
            });
        }
        if (record.changes.charm !== 0) {
            changes.push({
                icon: '✨',
                name: '魅力',
                value: record.changes.charm,
                current: record.after.charm
            });
        }

        changesContainer.innerHTML = changes.map(c => `
            <div class="change-item">
                <span class="change-icon">${c.icon}</span>
                <span>${c.name}</span>
                <span class="change-value ${c.value > 0 ? 'positive' : 'negative'}">
                    ${c.value > 0 ? '+' : ''}${c.value}
                </span>
                <span>→ ${c.current}</span>
            </div>
        `).join('');

        // 生成鼓励消息
        const messages = [
            '继续保持！每一步都是进步',
            '行动改变状态，状态驱动行动',
            '你在变得更好，这很棒',
            '记录即开始，坚持即胜利',
            '今天的行动是明天的基础'
        ];
        messageEl.textContent = messages[Math.floor(Math.random() * messages.length)];

        modal.classList.add('active');
    }

    openHistoryModal() {
        const modal = document.getElementById('history-modal');
        const container = document.getElementById('history-list');
        const history = this.state.getTodayHistory();

        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>今天还没有记录行动</p>
                    <p>点击"记录行动"开始吧！</p>
                </div>
            `;
        } else {
            container.innerHTML = history.map(h => {
                const time = new Date(h.timestamp).toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                const changes = [];
                if (h.changes.energy !== 0) changes.push(`${h.changes.energy > 0 ? '+' : ''}${h.changes.energy}体`);
                if (h.changes.mental !== 0) changes.push(`${h.changes.mental > 0 ? '+' : ''}${h.changes.mental}心`);
                if (h.changes.charm !== 0) changes.push(`+${h.changes.charm}魅`);

                return `
                    <div class="history-item">
                        <span class="history-time">${time}</span>
                        <span class="history-action">${h.actionName}</span>
                        <span class="history-changes">${changes.join(' ')}</span>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    const gameState = new GameState();
    const ui = new UIController(gameState);
    
    // 暴露到全局，方便调试
    window.gameState = gameState;
    window.ui = ui;
    
    console.log('🎮 游戏化人生系统已启动');
    console.log('当前状态：', {
        体力: gameState.energy,
        心理: gameState.mental,
        魅力: gameState.charm
    });
});
