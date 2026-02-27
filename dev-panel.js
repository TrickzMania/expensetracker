// ============================================
// DEV PANEL - Time Simulation UI Controls
// ============================================
// Provides a floating control panel toggled with
// Ctrl+Shift+D to manipulate AppClock, trigger
// rollover checks, and view an event log.
// Only initializes on localhost environments.
// ============================================

(function () {
    // Safety: Only run in local development
    const IS_DEV = window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.hostname === ''
        || window.location.protocol === 'file:';

    if (!IS_DEV) {
        console.log('Dev Panel: Not a dev environment, skipping.');
        return;
    }

    function createDevPanel() {
        const panel = document.createElement('div');
        panel.id = 'dev-panel';
        panel.innerHTML = `
            <div class="dev-panel-header">
                <span>🛠️ Dev Tools — Time Simulator</span>
                <button id="devPanelCollapse" title="Minimize">_</button>
            </div>
            <div class="dev-panel-body">
                <div class="dev-section">
                    <label>⏰ Current Simulated Date</label>
                    <div id="dev-current-date" class="dev-date-display">Real Time</div>
                    <div id="dev-mode-badge" class="dev-mode-badge off">DEV MODE OFF</div>
                </div>
                <div class="dev-section">
                    <label>Jump to Date</label>
                    <input type="date" id="dev-date-picker" />
                    <button onclick="DevPanel.jumpToDate()" class="dev-btn-action">Set Date</button>
                </div>
                <div class="dev-section">
                    <label>Quick Time Travel</label>
                    <div class="dev-btn-group">
                        <button onclick="AppClock.advanceDays(1)">+1 Day</button>
                        <button onclick="AppClock.advanceDays(7)">+1 Week</button>
                        <button onclick="AppClock.advanceToNextMonth()">→ Next Month</button>
                    </div>
                </div>
                <div class="dev-section">
                    <label>Rollover Actions</label>
                    <button onclick="DevPanel.triggerRollover()" class="dev-btn-primary">
                        🔄 Trigger Rollover Check
                    </button>
                    <button onclick="DevPanel.resetRolloverFlags()" class="dev-btn-danger">
                        🗑️ Reset All Rollover Flags
                    </button>
                </div>
                <div class="dev-section">
                    <label>📋 Event Log</label>
                    <div id="dev-log" class="dev-log"></div>
                </div>
                <div class="dev-section">
                    <button onclick="DevPanel.returnToRealTime()" class="dev-btn-secondary">
                        ↩️ Return to Real Time
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Collapse/expand toggle
        document.getElementById('devPanelCollapse').addEventListener('click', () => {
            panel.classList.toggle('collapsed');
        });

        // Update display whenever clock changes
        AppClock.onChange((date) => {
            const display = document.getElementById('dev-current-date');
            const badge = document.getElementById('dev-mode-badge');
            if (display) {
                display.textContent = date.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            if (badge) {
                if (AppClock.isDevMode()) {
                    badge.className = 'dev-mode-badge on';
                    badge.textContent = 'DEV MODE ON';
                } else {
                    badge.className = 'dev-mode-badge off';
                    badge.textContent = 'DEV MODE OFF';
                }
            }
            DevPanel.log(`Clock → ${date.toISOString().split('T')[0]}`);
        });

        // Toggle panel visibility with Ctrl+Shift+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                panel.classList.toggle('visible');
                if (panel.classList.contains('visible') && !AppClock.isDevMode()) {
                    AppClock.enableDevMode();
                }
            }
        });
    }

    // Public DevPanel API (attached to window)
    window.DevPanel = {
        jumpToDate() {
            const dateVal = document.getElementById('dev-date-picker').value;
            if (dateVal) {
                AppClock.setDate(dateVal);
                this.log(`Jumped to ${dateVal}`);
            } else {
                this.log('⚠️ Please select a date first');
            }
        },

        async triggerRollover() {
            this.log('Manually triggering rollover check...');

            // Clear the "already processed" flag so rollover runs
            const currentMonth = AppClock.currentMonth();
            const previousMonth = typeof getPreviousMonth === 'function'
                ? getPreviousMonth(currentMonth)
                : null;

            const userId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : 'local';

            if (previousMonth) {
                localStorage.removeItem(`rollover_${userId}_${previousMonth}`);
            }
            localStorage.removeItem(`lastRolloverCheck_${userId}`);

            // Call the existing rollover function
            if (typeof checkForMonthlyRollover === 'function') {
                await checkForMonthlyRollover();
                this.log('Rollover check complete ✅');
            } else {
                this.log('⚠️ checkForMonthlyRollover not found (are you on savings page?)');
            }
        },

        resetRolloverFlags() {
            const keys = Object.keys(localStorage);
            let count = 0;
            keys.forEach(key => {
                if (key.startsWith('rollover_') || key.startsWith('lastRolloverCheck')) {
                    localStorage.removeItem(key);
                    count++;
                }
            });
            this.log(`Cleared ${count} rollover flag(s) 🗑️`);
        },

        returnToRealTime() {
            AppClock.disableDevMode();
            const display = document.getElementById('dev-current-date');
            if (display) display.textContent = 'Real Time';
            this.log('Returned to real time ↩️');
        },

        log(message) {
            const logEl = document.getElementById('dev-log');
            if (!logEl) return;
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.innerHTML = `<span class="dev-log-time">[${time}]</span> ${message}`;
            logEl.insertBefore(entry, logEl.firstChild);
            // Keep only last 30 entries
            while (logEl.children.length > 30) {
                logEl.removeChild(logEl.lastChild);
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createDevPanel);
    } else {
        createDevPanel();
    }
})();
