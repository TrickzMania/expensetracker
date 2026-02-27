// ============================================
// SAVINGS PAGE SCRIPT
// Firebase config loaded from firebase-config.js
// ============================================

// Global variables
let savings = [];
let savingsGoal = 0;
let savingsChart = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setTodayDate();
    loadGoal();
    loadSavings();
    setupEventListeners();
    checkDarkMode();
    checkForMonthlyRollover(); // Check if we need to process rollover
});

// Set today's date as default
function setTodayDate() {
    const today = AppClock.today();
    document.getElementById('savingsDate').value = today;
}

// Utility to get current user ID across pages
function getCurrentUserId() {
    if (typeof auth !== 'undefined' && auth && auth.currentUser) {
        return auth.currentUser.uid;
    }
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            return JSON.parse(storedUser).uid;
        } catch (e) {
            return 'local';
        }
    }
    return 'local';
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('savingsForm').addEventListener('submit', addSavings);
    document.getElementById('setGoalBtn').addEventListener('click', setSavingsGoal);
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('filterSavingsType').addEventListener('change', filterSavings);
    document.getElementById('filterSavingsMonth').addEventListener('change', filterSavings);
}

// Check for monthly rollover
async function checkForMonthlyRollover() {
    const userId = getCurrentUserId();
    const lastCheck = localStorage.getItem(`lastRolloverCheck_${userId}`);
    const today = AppClock.today();
    const currentMonth = AppClock.currentMonth();

    // If we haven't checked today or it's a new month
    if (!lastCheck || lastCheck.slice(0, 7) !== currentMonth) {
        // Check if this is the first day of a new month
        const previousMonth = getPreviousMonth(currentMonth);
        const alreadyProcessed = localStorage.getItem(`rollover_${userId}_${previousMonth}`);

        if (!alreadyProcessed) {
            await processMonthlyRollover(previousMonth);
            localStorage.setItem(`rollover_${userId}_${previousMonth}`, 'true');
        }

        localStorage.setItem(`lastRolloverCheck_${userId}`, today);
    }
}

// Get previous month in YYYY-MM format
function getPreviousMonth(currentMonth) {
    const [year, month] = currentMonth.split('-').map(Number);
    if (month === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
}

// Process monthly rollover
async function processMonthlyRollover(previousMonth) {
    try {
        // Get budget and expenses from previous month
        const storedBudgets = localStorage.getItem('monthlyBudgets');
        let monthlyBudgets = storedBudgets ? JSON.parse(storedBudgets) : {};
        let monthlyBudget = monthlyBudgets[previousMonth] || parseFloat(localStorage.getItem('monthlyBudget') || 0);

        if (monthlyBudget === 0) {
            console.log('No budget set, skipping rollover');
            return;
        }

        // Load expenses from Firebase or localStorage
        let expenses = [];
        const userId = getCurrentUserId();

        try {
            if (typeof useFirebase !== 'undefined' && useFirebase && typeof db !== 'undefined' && db && userId !== 'local') {
                const snapshot = await db.collection('expenses').where('userId', '==', userId).get();
                snapshot.forEach(doc => {
                    expenses.push(doc.data());
                });
            } else {
                throw new Error("Fallback to local storage");
            }
        } catch (error) {
            // Fallback to localStorage exactly how script.js stores them
            const stored = localStorage.getItem(`expenses_${userId}`);
            expenses = stored ? JSON.parse(stored) : [];
        }

        // Filter expenses for previous month
        const previousMonthExpenses = expenses.filter(exp =>
            exp.date.startsWith(previousMonth)
        );

        const totalSpent = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const remaining = monthlyBudget - totalSpent;

        // Only add to savings if there's remaining budget
        if (remaining > 0) {
            const rolloverSaving = {
                amount: remaining,
                description: `Auto-rollover from ${getMonthName(previousMonth)} budget`,
                date: AppClock.today(),
                isAutoRollover: true,
                fromMonth: previousMonth,
                timestamp: AppClock.now().toISOString()
            };

            // Add to Firebase or localStorage
            try {
                await db.collection('savings').add(rolloverSaving);
                showNotification(`🎉 ₹${remaining.toFixed(2)} automatically saved from last month's budget!`, 'success');
            } catch (error) {
                // Fallback to localStorage
                savings.push({ id: Date.now().toString(), ...rolloverSaving });
                saveSavingsToLocalStorage();
                showNotification(`🎉 ₹${remaining.toFixed(2)} automatically saved from last month's budget!`, 'success');
            }

            loadSavings();
        } else if (remaining < 0) {
            console.log(`Previous month exceeded budget by ₹${Math.abs(remaining)}, no rollover`);
        } else {
            console.log('No remaining budget to rollover');
        }
    } catch (error) {
        console.error('Error processing rollover:', error);
    }
}

// Get month name
function getMonthName(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// Add savings
async function addSavings(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('savingsAmount').value);
    const description = document.getElementById('savingsDescription').value;
    const date = document.getElementById('savingsDate').value;

    const saving = {
        amount,
        description,
        date,
        isAutoRollover: false,
        userId: getCurrentUserId(),
        timestamp: AppClock.now().toISOString()
    };


    if (useFirebase && db) {
        try {
            // Add to Firebase
            await db.collection('savings').add(saving);

            // Reset form
            document.getElementById('savingsForm').reset();
            setTodayDate();

            // Reload savings
            loadSavings();

            showNotification('Savings added successfully!', 'success');
            return;
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }

    // Use localStorage (default or fallback)
    saving.id = Date.now().toString();
    savings.push(saving);
    saveSavingsToLocalStorage();
    document.getElementById('savingsForm').reset();
    setTodayDate();
    loadSavingsFromLocalStorage();
    showNotification('Savings added successfully!', 'success');
}

// Load savings from Firebase
async function loadSavings() {
    try {
        const userId = getCurrentUserId();
        if (typeof useFirebase !== 'undefined' && useFirebase && typeof db !== 'undefined' && db && userId !== 'local') {
            const snapshot = await db.collection('savings')
                .where('userId', '==', userId)
                .get();
            savings = [];

            snapshot.forEach(doc => {
                savings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort descending by date client-side
            savings.sort((a, b) => new Date(b.date) - new Date(a.date));

            displaySavings(savings);
            updateSavingsSummary();
            updateSavingsChart();
            generateSavingsInsights();
        } else {
            throw new Error("Fallback to local storage");
        }
    } catch (error) {
        console.error('Error loading savings:', error);
        // If Firebase not configured, work with local storage
        loadSavingsFromLocalStorage();
    }
}

// Fallback: Local storage functions
function loadSavingsFromLocalStorage() {
    const userId = getCurrentUserId();
    const stored = localStorage.getItem(`savings_${userId}`);
    savings = stored ? JSON.parse(stored) : [];

    // Sort descending by date
    savings.sort((a, b) => new Date(b.date) - new Date(a.date));

    displaySavings(savings);
    updateSavingsSummary();
    updateSavingsChart();
    generateSavingsInsights();
}

function saveSavingsToLocalStorage() {
    const userId = getCurrentUserId();
    localStorage.setItem(`savings_${userId}`, JSON.stringify(savings));
}

// Display savings
function displaySavings(savingsToDisplay) {
    const savingsHistoryList = document.getElementById('savingsHistoryList');

    if (savingsToDisplay.length === 0) {
        savingsHistoryList.innerHTML = `
            <div class="empty-state">
                <h3>No savings yet</h3>
                <p>Start saving by adding manual savings or let the system auto-save from your budget!</p>
            </div>
        `;
        return;
    }

    savingsHistoryList.innerHTML = savingsToDisplay.map(saving => `
        <div class="expense-item ${saving.isAutoRollover ? 'auto-rollover' : ''}">
            <div class="expense-info">
                <h4>${saving.description}</h4>
                <p>${new Date(saving.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
                ${saving.isAutoRollover ?
            '<span class="expense-category" style="background: var(--success-color);">🎯 Auto-Rollover</span>' :
            '<span class="expense-category" style="background: var(--primary-color);">✋ Manual</span>'
        }
            </div>
            <div class="expense-amount" style="color: var(--success-color);">+₹${saving.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-delete" onclick="confirmDeleteSaving('${saving.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Show custom confirmation modal for deleting
let savingToDeleteId = null;

function confirmDeleteSaving(id) {
    savingToDeleteId = id;
    const modal = document.getElementById('confirmModal');
    if (modal) {
        document.getElementById('confirmModalTitle').textContent = 'Delete Saving?';
        document.getElementById('confirmModalMessage').textContent = 'Are you sure you want to delete this saving entry? This action cannot be undone.';
        modal.style.display = 'flex';

        // Remove old listeners to prevent multiple triggers
        const confirmBtn = document.getElementById('confirmModalConfirm');
        const cancelBtn = document.getElementById('confirmModalCancel');

        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (savingToDeleteId) {
                executeDeleteSaving(savingToDeleteId);
                savingToDeleteId = null;
            }
        });

        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            savingToDeleteId = null;
        });
    } else {
        // Fallback to native confirm if modal HTML is missing (should never happen)
        if (confirm('Are you sure you want to delete this saving entry?')) {
            executeDeleteSaving(id);
        }
    }
}

// Execute the actual deletion
async function executeDeleteSaving(id) {
    const isFirebaseActive = typeof useFirebase !== 'undefined' && useFirebase && typeof db !== 'undefined' && db;

    if (isFirebaseActive) {
        try {
            await db.collection('savings').doc(id).delete();
            await loadSavings();
            showNotification('Saving deleted successfully!', 'success');
            return;
        } catch (error) {
            console.error('Firebase error deleting saving:', error);
            showNotification('Failed to delete saving from database.', 'error');
            return; // CRITICAL: Stop here, don't fall back to local storage if Firebase failed
        }
    }

    // Fallback exactly to local storage ONLY if Firebase is completely disabled/offline
    savings = savings.filter(s => String(s.id) !== String(id));
    saveSavingsToLocalStorage();
    loadSavingsFromLocalStorage();
    showNotification('Saving deleted successfully!', 'success');
}

// Update savings summary
function updateSavingsSummary() {
    const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);

    // Current month savings
    const currentMonth = AppClock.currentMonth();
    const currentMonthSavings = savings
        .filter(s => s.date.startsWith(currentMonth))
        .reduce((sum, s) => sum + s.amount, 0);

    document.getElementById('totalSavings').textContent = `₹${totalSavings.toFixed(2)}`;
    document.getElementById('monthSavings').textContent = `₹${currentMonthSavings.toFixed(2)}`;

    // Update goal progress
    if (savingsGoal > 0) {
        updateGoalProgress(totalSavings);
    }
}

// Set savings goal
function setSavingsGoal() {
    const goal = parseFloat(document.getElementById('goalInput').value);

    if (isNaN(goal) || goal <= 0) {
        showNotification('Please enter a valid savings goal', 'error');
        return;
    }

    savingsGoal = goal;
    const userId = getCurrentUserId();
    localStorage.setItem(`savingsGoal_${userId}`, savingsGoal);

    document.getElementById('goalProgress').style.display = 'block';
    document.getElementById('savingsGoal').textContent = `₹${savingsGoal.toFixed(2)}`;
    updateSavingsSummary();
    showNotification('Savings goal set successfully!', 'success');
}

// Load goal
function loadGoal() {
    const userId = getCurrentUserId();
    const stored = localStorage.getItem(`savingsGoal_${userId}`);
    if (stored) {
        savingsGoal = parseFloat(stored);
        document.getElementById('goalInput').value = savingsGoal;
        document.getElementById('savingsGoal').textContent = `₹${savingsGoal.toFixed(2)}`;
        document.getElementById('goalProgress').style.display = 'block';
    }
}

// Update goal progress
function updateGoalProgress(totalSavings) {
    const percentage = (totalSavings / savingsGoal) * 100;
    const progressBar = document.getElementById('goalProgressBar');
    const progressText = document.getElementById('goalProgressText');
    const goalMessage = document.getElementById('goalMessage');

    progressBar.style.width = `${Math.min(percentage, 100)}%`;
    progressText.textContent = `${percentage.toFixed(1)}%`;

    if (percentage >= 100) {
        goalMessage.textContent = '🎉 Congratulations! You reached your savings goal!';
        goalMessage.style.color = 'var(--success-color)';
    } else {
        const remaining = savingsGoal - totalSavings;
        goalMessage.textContent = `₹${remaining.toFixed(2)} more to reach your goal`;
        goalMessage.style.color = 'var(--text-secondary)';
    }
}

// Filter savings
function filterSavings() {
    const type = document.getElementById('filterSavingsType').value;
    const month = document.getElementById('filterSavingsMonth').value;

    let filtered = savings;

    if (type === 'auto') {
        filtered = filtered.filter(s => s.isAutoRollover);
    } else if (type === 'manual') {
        filtered = filtered.filter(s => !s.isAutoRollover);
    }

    if (month) {
        filtered = filtered.filter(s => s.date.startsWith(month));
    }

    displaySavings(filtered);
}

// Update savings chart
function updateSavingsChart() {
    const ctx = document.getElementById('savingsChart').getContext('2d');

    if (savingsChart) {
        savingsChart.destroy();
    }

    // Group by month
    const monthlySavings = {};
    savings.forEach(s => {
        const month = s.date.slice(0, 7); // YYYY-MM
        monthlySavings[month] = (monthlySavings[month] || 0) + s.amount;
    });

    // Sort by date
    const sorted = Object.entries(monthlySavings).sort((a, b) => a[0].localeCompare(b[0]));

    // Calculate cumulative
    let cumulative = 0;
    const cumulativeData = sorted.map(([month, amount]) => {
        cumulative += amount;
        return cumulative;
    });

    const labels = sorted.map(([month]) => {
        const [year, m] = month.split('-');
        return new Date(year, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    });

    savingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Savings',
                data: cumulativeData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-color')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
                    },
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border-color')
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
                    },
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border-color')
                    }
                }
            }
        }
    });
}

// Generate savings insights
function generateSavingsInsights() {
    const insightsList = document.getElementById('savingsInsights');
    const insights = [];

    if (savings.length === 0) {
        insightsList.innerHTML = '<p>Start saving to see insights</p>';
        return;
    }

    const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);
    const autoRolloverSavings = savings.filter(s => s.isAutoRollover).reduce((sum, s) => sum + s.amount, 0);
    const manualSavings = totalSavings - autoRolloverSavings;

    insights.push(`Total savings: ₹${totalSavings.toFixed(2)}`);
    insights.push(`Auto-rollover savings: ₹${autoRolloverSavings.toFixed(2)} (${((autoRolloverSavings / totalSavings) * 100).toFixed(1)}%)`);
    insights.push(`Manual savings: ₹${manualSavings.toFixed(2)} (${((manualSavings / totalSavings) * 100).toFixed(1)}%)`);

    // Average monthly savings
    const uniqueMonths = [...new Set(savings.map(s => s.date.slice(0, 7)))];
    const avgMonthlySavings = totalSavings / uniqueMonths.length;
    insights.push(`Average monthly savings: ₹${avgMonthlySavings.toFixed(2)}`);

    // Goal insights
    if (savingsGoal > 0) {
        const remaining = savingsGoal - totalSavings;
        if (remaining > 0) {
            const monthsToGoal = Math.ceil(remaining / avgMonthlySavings);
            insights.push(`At current rate, you'll reach your goal in ${monthsToGoal} months`);
        } else {
            insights.push(`🎉 You've exceeded your savings goal by ₹${Math.abs(remaining).toFixed(2)}!`);
        }
    }

    insightsList.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <p>💡 ${insight}</p>
        </div>
    `).join('');
}

// Dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));

    const btn = document.getElementById('darkModeToggle');
    btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';

    // Redraw chart with new colors
    updateSavingsChart();
}

function checkDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').textContent = '☀️';
    }
}

// Utility functions
function showNotification(message, type) {
    showToast(message, type);
}

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        document.body.appendChild(newContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.getElementById('toastContainer').appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Loading Overlay
function showLoading() {
    // Remove existing if any
    hideLoading();

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}