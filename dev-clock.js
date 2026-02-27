// ============================================
// DEV CLOCK - Virtual Time Simulation System
// ============================================
// This module provides a centralized clock that all
// app code should use instead of `new Date()`.
// In dev mode, the clock can be manipulated to test
// time-dependent features like monthly rollover.
// In production, it transparently returns real time.
// ============================================

const AppClock = (() => {
    let _simulatedDate = null;
    let _devMode = false;
    let _listeners = [];

    return {
        /**
         * Enable dev mode with an optional starting date.
         * If no date is provided, starts from the current real time.
         */
        enableDevMode(startDate = null) {
            _devMode = true;
            _simulatedDate = startDate ? new Date(startDate) : new Date();
            console.log(`🕐 Dev Clock ENABLED at: ${_simulatedDate.toISOString()}`);
            this._notify();
        },

        /**
         * Disable dev mode — clock returns to real time.
         */
        disableDevMode() {
            _devMode = false;
            _simulatedDate = null;
            console.log('🕐 Dev Clock DISABLED — using real time');
            this._notify();
        },

        /**
         * The single source of truth for "now".
         * Use this everywhere instead of `new Date()`.
         */
        now() {
            return _devMode && _simulatedDate
                ? new Date(_simulatedDate)
                : new Date();
        },

        /**
         * Get today's date as YYYY-MM-DD string.
         */
        today() {
            return this.now().toISOString().split('T')[0];
        },

        /**
         * Get current month as YYYY-MM string.
         */
        currentMonth() {
            return this.today().slice(0, 7);
        },

        /**
         * Jump to a specific date (YYYY-MM-DD).
         */
        setDate(dateString) {
            if (!_devMode) this.enableDevMode();
            _simulatedDate = new Date(dateString + 'T12:00:00');
            console.log(`🕐 Clock set to: ${_simulatedDate.toISOString()}`);
            this._notify();
        },

        /**
         * Advance by N days.
         */
        advanceDays(n) {
            if (!_devMode) this.enableDevMode();
            _simulatedDate.setDate(_simulatedDate.getDate() + n);
            console.log(`🕐 Advanced ${n} day(s) → ${_simulatedDate.toISOString()}`);
            this._notify();
        },

        /**
         * Advance to the 1st of the next month.
         */
        advanceToNextMonth() {
            if (!_devMode) this.enableDevMode();
            _simulatedDate.setMonth(_simulatedDate.getMonth() + 1, 1);
            console.log(`🕐 Jumped to next month → ${_simulatedDate.toISOString()}`);
            this._notify();
        },

        /**
         * Subscribe to clock changes (used by dev panel).
         */
        onChange(callback) {
            _listeners.push(callback);
        },

        /** @private */
        _notify() {
            _listeners.forEach(cb => cb(this.now()));
        },

        /**
         * Check if dev mode is currently active.
         */
        isDevMode() {
            return _devMode;
        }
    };
})();
