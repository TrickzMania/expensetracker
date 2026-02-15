// ============================================
// PERSONAL EXPENSE TRACKER - MAIN SCRIPT
// Firebase config loaded from firebase-config.js
// ============================================

// ============================================
// GLOBAL VARIABLES
// ============================================
let expenses = [];
let monthlyBudget = 0;
let categoryChart = null;
let spendingChart = null;
let templates = [];
let editingExpenseId = null;
let currentUser = null;

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

// Check authentication status
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email
            };
            showUserUI();
            initializeApp();
        } else {
            showLoginUI();
        }
    });
} else {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showUserUI();
        initializeApp();
    } else {
        showLoginUI();
    }
}

// Show/Hide UI based on auth state
function showLoginUI() {
    const loginUI = document.getElementById('loginUI');
    const userUI = document.getElementById('userUI');
    if (loginUI) loginUI.style.display = 'flex';
    if (userUI) userUI.style.display = 'none';
    hideMainContent();
}

function showUserUI() {
    const loginUI = document.getElementById('loginUI');
    const userUI = document.getElementById('userUI');
    if (loginUI) loginUI.style.display = 'none';
    if (userUI) userUI.style.display = 'flex';
    showMainContent();
}

function hideMainContent() {
    const sections = document.querySelectorAll('.container > *:not(header)');
    sections.forEach(section => {
        if (section) section.style.display = 'none';
    });
}

function showMainContent() {
    const sections = document.querySelectorAll('.container > *:not(header)');
    sections.forEach(section => {
        if (section) section.style.display = '';
    });
    
    // CRITICAL: Force chart re-render after showing content
    setTimeout(() => {
        if (expenses.length > 0) {
            updateCategoryBreakdown();
            updateSpendingChart();
        }
    }, 100);
}

// ============================================
// INLINE LOGIN FUNCTIONS
// ============================================

function proceedToPassword() {
    const email = document.getElementById('headerEmail');
    if (!email) return;
    
    const emailValue = email.value.trim();
    
    if (!emailValue) {
        showLoginError('Please enter your email');
        return;
    }
    
    if (!isValidEmail(emailValue)) {
        showLoginError('Please enter a valid email');
        return;
    }
    
    const emailStep = document.getElementById('emailStep');
    const passwordStep = document.getElementById('passwordStep');
    const passwordInput = document.getElementById('headerPassword');
    
    if (emailStep) emailStep.style.display = 'none';
    if (passwordStep) passwordStep.style.display = 'flex';
    if (passwordInput) passwordInput.focus();
}

function backToEmail() {
    const passwordStep = document.getElementById('passwordStep');
    const emailStep = document.getElementById('emailStep');
    const passwordInput = document.getElementById('headerPassword');
    
    if (passwordStep) passwordStep.style.display = 'none';
    if (emailStep) emailStep.style.display = 'flex';
    if (passwordInput) passwordInput.value = '';
    hideLoginError();
}

async function performLogin() {
    const emailInput = document.getElementById('headerEmail');
    const passwordInput = document.getElementById('headerPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!password) {
        showLoginError('Please enter your password');
        return;
    }
    
    const btns = document.querySelectorAll('#passwordStep button');
    const loginBtn = btns[0];
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }
    
    if (!auth) {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        const user = users[email];
        
        if (user && user.password === password) {
            currentUser = { email, name: user.name, uid: user.uid };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Login successful!', 'success');
            showUserUI();
            initializeApp();
        } else {
            showLoginError('Invalid email or password');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        }
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName || userCredential.user.email
        };
        showToast('Login successful!', 'success');
        showUserUI();
        initializeApp();
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found. Sign up?';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email';
                break;
        }
        
        showLoginError(errorMessage);
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }
}

function showLoginError(message) {
    hideLoginError();
    const error = document.createElement('div');
    error.className = 'login-error';
    error.textContent = message;
    error.id = 'loginError';
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) headerControls.appendChild(error);
    
    setTimeout(hideLoginError, 4000);
}

function hideLoginError() {
    const error = document.getElementById('loginError');
    if (error) error.remove();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// APP INITIALIZATION
// ============================================

function initializeApp() {
    console.log('Initializing app for user:', currentUser);
    
    if (currentUser) {
        const greeting = document.getElementById('userGreeting');
        if (greeting) {
            greeting.textContent = `Hello, ${currentUser.name || currentUser.email}!`;
        }
    }
    
    setTodayDate();
    displayCurrentMonth();
    loadBudget();
    loadTemplates();
    loadExpenses();
    setupEventListeners();
    checkDarkMode();
    
    // Add Enter key handlers for login
    const emailInput = document.getElementById('headerEmail');
    const passwordInput = document.getElementById('headerPassword');
    
    if (emailInput && !emailInput.hasAttribute('data-listener')) {
        emailInput.setAttribute('data-listener', 'true');
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                proceedToPassword();
            }
        });
    }
    
    if (passwordInput && !passwordInput.hasAttribute('data-listener')) {
        passwordInput.setAttribute('data-listener', 'true');
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performLogin();
            }
        });
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        if (auth) {
            auth.signOut().then(() => {
                window.location.reload();
            });
        } else {
            localStorage.removeItem('currentUser');
            window.location.reload();
        }
    }
}

// ============================================
// DATE FUNCTIONS
// ============================================

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = today;
}

function displayCurrentMonth() {
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const display = document.getElementById('currentMonthDisplay');
    if (display) display.textContent = monthName;
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const expenseForm = document.getElementById('expenseForm');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const exportBtn = document.getElementById('exportBtn');
    const filterCategory = document.getElementById('filterCategory');
    const filterMonth = document.getElementById('filterMonth');
    const addTemplateBtn = document.getElementById('addTemplateBtn');
    const searchExpenses = document.getElementById('searchExpenses');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Remove existing listeners by cloning (prevents duplicates)
    if (expenseForm) {
        const newForm = expenseForm.cloneNode(true);
        expenseForm.parentNode.replaceChild(newForm, expenseForm);
        newForm.addEventListener('submit', addExpense);
    }
    
    if (setBudgetBtn && !setBudgetBtn.hasAttribute('data-listener')) {
        setBudgetBtn.setAttribute('data-listener', 'true');
        setBudgetBtn.addEventListener('click', setBudget);
    }
    
    if (darkModeToggle && !darkModeToggle.hasAttribute('data-listener')) {
        darkModeToggle.setAttribute('data-listener', 'true');
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    if (exportBtn && !exportBtn.hasAttribute('data-listener')) {
        exportBtn.setAttribute('data-listener', 'true');
        exportBtn.addEventListener('click', exportToCSV);
    }
    
    if (filterCategory && !filterCategory.hasAttribute('data-listener')) {
        filterCategory.setAttribute('data-listener', 'true');
        filterCategory.addEventListener('change', filterExpenses);
    }
    
    if (filterMonth && !filterMonth.hasAttribute('data-listener')) {
        filterMonth.setAttribute('data-listener', 'true');
        filterMonth.addEventListener('change', filterExpenses);
    }
    
    if (addTemplateBtn && !addTemplateBtn.hasAttribute('data-listener')) {
        addTemplateBtn.setAttribute('data-listener', 'true');
        addTemplateBtn.addEventListener('click', showTemplateModal);
    }
    
    if (searchExpenses && !searchExpenses.hasAttribute('data-listener')) {
        searchExpenses.setAttribute('data-listener', 'true');
        searchExpenses.addEventListener('input', searchAndFilterExpenses);
    }
    
    if (logoutBtn && !logoutBtn.hasAttribute('data-listener')) {
        logoutBtn.setAttribute('data-listener', 'true');
        logoutBtn.addEventListener('click', logout);
    }
    
    console.log('Event listeners setup complete');
}

// ============================================
// EXPENSE MANAGEMENT
// ============================================

async function addExpense(e) {
    e.preventDefault();
    console.log('Adding expense...');
    
    if (editingExpenseId) {
        await updateExpense();
        return;
    }
    
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    const recurringInput = document.getElementById('recurring');
    
    if (!amountInput || !categoryInput || !descriptionInput || !dateInput) {
        showToast('Form error - please refresh page', 'error');
        return;
    }
    
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const description = descriptionInput.value;
    const date = dateInput.value;
    const recurring = recurringInput ? recurringInput.checked : false;
    
    const expense = {
        amount,
        category,
        description,
        date,
        recurring,
        userId: currentUser ? currentUser.uid : 'local',
        timestamp: new Date().toISOString()
    };
    
    if (useFirebase && db && currentUser) {
        try {
            await db.collection('expenses').add(expense);
            document.getElementById('expenseForm').reset();
            setTodayDate();
            await loadExpenses();
            showToast('Expense added successfully!', 'success');
            return;
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    expense.id = Date.now().toString();
    expenses.push(expense);
    saveExpensesToLocalStorage();
    document.getElementById('expenseForm').reset();
    setTodayDate();
    loadExpensesFromLocalStorage();
    showToast('Expense added successfully!', 'success');
}

async function loadExpenses() {
    console.log('Loading expenses...');
    
    if (useFirebase && db && currentUser) {
        try {
            const snapshot = await db.collection('expenses')
                .where('userId', '==', currentUser.uid)
                .orderBy('date', 'desc')
                .get();
            expenses = [];
            
            snapshot.forEach(doc => {
                expenses.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Loaded expenses from Firebase:', expenses.length);
            refreshAllDisplays();
            return;
        } catch (error) {
            console.error('Error loading from Firebase:', error);
        }
    }
    
    loadExpensesFromLocalStorage();
}

function loadExpensesFromLocalStorage() {
    const userId = currentUser ? currentUser.uid : 'local';
    const stored = localStorage.getItem(`expenses_${userId}`);
    expenses = stored ? JSON.parse(stored) : [];
    console.log('Loaded expenses from localStorage:', expenses.length);
    refreshAllDisplays();
}

function refreshAllDisplays() {
    console.log('Refreshing all displays...');
    displayExpenses(expenses);
    updateSummary();
    updateCategoryBreakdown();
    updateSpendingChart();
    generateInsights();
    generateMonthComparison();
}

function saveExpensesToLocalStorage() {
    const userId = currentUser ? currentUser.uid : 'local';
    localStorage.setItem(`expenses_${userId}`, JSON.stringify(expenses));
}

function displayExpenses(expensesToDisplay) {
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;
    
    if (!expensesToDisplay || expensesToDisplay.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <h3>No expenses yet</h3>
                <p>Start tracking by adding your first expense above</p>
            </div>
        `;
        return;
    }
    
    expensesList.innerHTML = expensesToDisplay.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <h4>${expense.description}</h4>
                <p>${new Date(expense.date).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</p>
                <span class="expense-category">${getCategoryIcon(expense.category)} ${expense.category}</span>
                ${expense.recurring ? '<span class="expense-category" style="background: #8b5cf6;">🔄 Recurring</span>' : ''}
            </div>
            <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-edit" onclick="editExpense('${expense.id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteExpense('${expense.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    if (useFirebase && db) {
        try {
            await db.collection('expenses').doc(id).delete();
            await loadExpenses();
            showToast('Expense deleted successfully!', 'success');
            return;
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    expenses = expenses.filter(exp => exp.id !== id);
    saveExpensesToLocalStorage();
    loadExpensesFromLocalStorage();
    showToast('Expense deleted successfully!', 'success');
}

function editExpense(id) {
    const expense = expenses.find(exp => exp.id === id);
    if (!expense) return;
    
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    const recurringInput = document.getElementById('recurring');
    
    if (amountInput) amountInput.value = expense.amount;
    if (categoryInput) categoryInput.value = expense.category;
    if (descriptionInput) descriptionInput.value = expense.description;
    if (dateInput) dateInput.value = expense.date;
    if (recurringInput) recurringInput.checked = expense.recurring || false;
    
    const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Expense';
        submitBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    }
    
    editingExpenseId = id;
    
    const form = document.getElementById('expenseForm');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    showToast('Editing expense - make changes and click Update', 'info');
}

async function updateExpense() {
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    const recurringInput = document.getElementById('recurring');
    
    if (!amountInput || !categoryInput || !descriptionInput || !dateInput) return;
    
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const description = descriptionInput.value;
    const date = dateInput.value;
    const recurring = recurringInput ? recurringInput.checked : false;
    
    const updatedExpense = {
        amount,
        category,
        description,
        date,
        recurring,
        userId: currentUser ? currentUser.uid : 'local',
        timestamp: new Date().toISOString()
    };
    
    if (useFirebase && db) {
        try {
            await db.collection('expenses').doc(editingExpenseId).update(updatedExpense);
            resetExpenseForm();
            await loadExpenses();
            showToast('Expense updated successfully!', 'success');
            return;
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    const expIndex = expenses.findIndex(exp => exp.id === editingExpenseId);
    if (expIndex !== -1) {
        expenses[expIndex] = { id: editingExpenseId, ...updatedExpense };
        saveExpensesToLocalStorage();
        resetExpenseForm();
        loadExpensesFromLocalStorage();
        showToast('Expense updated successfully!', 'success');
    }
}

function resetExpenseForm() {
    const form = document.getElementById('expenseForm');
    if (form) form.reset();
    setTodayDate();
    const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Add Expense';
        submitBtn.style.background = '';
    }
    editingExpenseId = null;
}

// ============================================
// BUDGET MANAGEMENT
// ============================================

function updateSummary() {
    console.log('Updating summary...');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    const total = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const remaining = monthlyBudget - total;
    
    const totalSpending = document.getElementById('totalSpending');
    const monthlyBudgetEl = document.getElementById('monthlyBudget');
    const remainingEl = document.getElementById('remaining');
    
    if (totalSpending) totalSpending.textContent = `₹${total.toFixed(2)}`;
    if (monthlyBudgetEl) monthlyBudgetEl.textContent = `₹${monthlyBudget.toFixed(2)}`;
    if (remainingEl) {
        remainingEl.textContent = `₹${remaining.toFixed(2)}`;
        
        if (remaining < 0) {
            remainingEl.style.color = 'var(--danger-color)';
        } else if (remaining < monthlyBudget * 0.2) {
            remainingEl.style.color = 'var(--warning-color)';
        } else {
            remainingEl.style.color = 'var(--success-color)';
        }
    }
    
    if (monthlyBudget > 0) {
        updateProgressBar(total, monthlyBudget);
    }
}

function setBudget() {
    console.log('Setting budget...');
    const budgetInput = document.getElementById('budgetInput');
    if (!budgetInput) return;
    
    const budget = parseFloat(budgetInput.value);
    
    if (isNaN(budget) || budget <= 0) {
        showToast('Please enter a valid budget amount', 'error');
        return;
    }
    
    monthlyBudget = budget;
    localStorage.setItem('monthlyBudget', monthlyBudget);
    
    const progressDiv = document.getElementById('budgetProgress');
    if (progressDiv) progressDiv.style.display = 'block';
    
    updateSummary();
    showToast('Budget set successfully!', 'success');
}

function loadBudget() {
    const stored = localStorage.getItem('monthlyBudget');
    if (stored) {
        monthlyBudget = parseFloat(stored);
        const budgetInput = document.getElementById('budgetInput');
        if (budgetInput) budgetInput.value = monthlyBudget;
        const progressDiv = document.getElementById('budgetProgress');
        if (progressDiv) progressDiv.style.display = 'block';
    }
}

function updateProgressBar(spent, budget) {
    const percentage = (spent / budget) * 100;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
        progressBar.className = 'progress-bar';
        if (percentage >= 100) {
            progressBar.classList.add('danger');
        } else if (percentage >= 80) {
            progressBar.classList.add('warning');
        }
    }
    
    if (progressText) {
        progressText.textContent = `${percentage.toFixed(1)}%`;
    }
}

// ============================================
// CATEGORY BREAKDOWN
// ============================================

function updateCategoryBreakdown() {
    console.log('Updating category breakdown...');
    
    if (!expenses || expenses.length === 0) {
        const categoryList = document.getElementById('categoryList');
        if (categoryList) {
            categoryList.innerHTML = '<p style="color: var(--text-secondary);">No expenses to display</p>';
        }
        return;
    }
    
    const categoryTotals = {};
    
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    const categoryList = document.getElementById('categoryList');
    if (categoryList) {
        categoryList.innerHTML = sorted.map(([category, amount]) => `
            <div class="category-item">
                <span class="category-name">${getCategoryIcon(category)} ${category}</span>
                <span class="category-amount">₹${amount.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    updateCategoryChart(categoryTotals);
}

function updateCategoryChart(categoryTotals) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) {
        console.log('Category chart canvas not found');
        return;
    }
    
    // Destroy existing chart
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    if (labels.length === 0) {
        console.log('No category data to display');
        return;
    }
    
    try {
        categoryChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
                        '#10b981', '#3b82f6', '#ef4444', '#64748b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
                        }
                    }
                }
            }
        });
        console.log('Category chart created successfully');
    } catch (error) {
        console.error('Error creating category chart:', error);
    }
}

// ============================================
// SPENDING CHART
// ============================================

function updateSpendingChart() {
    console.log('Updating spending chart...');
    
    const ctx = document.getElementById('spendingChart');
    if (!ctx) {
        console.log('Spending chart canvas not found');
        return;
    }
    
    // Destroy existing chart
    if (spendingChart) {
        spendingChart.destroy();
        spendingChart = null;
    }
    
    if (!expenses || expenses.length === 0) {
        console.log('No expenses for spending chart');
        return;
    }
    
    const dailyTotals = {};
    expenses.forEach(exp => {
        const date = exp.date;
        dailyTotals[date] = (dailyTotals[date] || 0) + exp.amount;
    });
    
    const sorted = Object.entries(dailyTotals).sort((a, b) => a[0].localeCompare(b[0]));
    
    if (sorted.length === 0) return;
    
    const labels = sorted.map(([date]) => new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    const data = sorted.map(([, amount]) => amount);
    
    try {
        spendingChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Spending',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
                            color: getComputedStyle(document.body).getPropertyValue('--text-color') || '#333'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666'
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color') || '#e5e7eb'
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666'
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color') || '#e5e7eb'
                        }
                    }
                }
            }
        });
        console.log('Spending chart created successfully');
    } catch (error) {
        console.error('Error creating spending chart:', error);
    }
}

// ============================================
// INSIGHTS
// ============================================

function generateInsights() {
    const insightsList = document.getElementById('insightsList');
    if (!insightsList) return;
    
    const insights = [];
    
    if (expenses.length === 0) {
        insightsList.innerHTML = '<p style="color: var(--text-secondary);">Add expenses to see insights</p>';
        return;
    }
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    
    if (currentMonthExpenses.length === 0) {
        insightsList.innerHTML = '<p style="color: var(--text-secondary);">No expenses for current month yet. Add expenses to see insights.</p>';
        return;
    }
    
    const categoryTotals = {};
    currentMonthExpenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    insights.push(`This month, your highest spending category is ${topCategory[0]} with ₹${topCategory[1].toFixed(2)}`);
    
    const uniqueDates = [...new Set(currentMonthExpenses.map(exp => exp.date))];
    const totalSpent = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgDaily = totalSpent / uniqueDates.length;
    insights.push(`Your average daily spending this month is ₹${avgDaily.toFixed(2)}`);
    
    const recurringTotal = currentMonthExpenses.filter(exp => exp.recurring).reduce((sum, exp) => sum + exp.amount, 0);
    if (recurringTotal > 0) {
        insights.push(`You have ₹${recurringTotal.toFixed(2)} in recurring expenses this month`);
    }
    
    if (monthlyBudget > 0) {
        const remaining = monthlyBudget - totalSpent;
        const currentDay = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const daysLeft = Math.max(1, daysInMonth - currentDay);
        const dailyBudget = remaining / daysLeft;
        
        if (dailyBudget > 0) {
            insights.push(`You can spend ₹${dailyBudget.toFixed(2)} per day for the rest of the month`);
        } else {
            insights.push(`You've exceeded your monthly budget by ₹${Math.abs(remaining).toFixed(2)}`);
        }
    }
    
    const totalAllExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    insights.push(`Total spending across all time: ₹${totalAllExpenses.toFixed(2)}`);
    
    insightsList.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <p>💡 ${insight}</p>
        </div>
    `).join('');
}

// ============================================
// MONTH COMPARISON
// ============================================

function generateMonthComparison() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const previousMonth = getPreviousMonthString(currentMonth);
    
    const currentMonthExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth));
    const previousMonthExpenses = expenses.filter(exp => exp.date.startsWith(previousMonth));
    
    const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const difference = currentTotal - previousTotal;
    const percentageChange = previousTotal > 0 ? ((difference / previousTotal) * 100) : 0;
    
    const comparisonView = document.getElementById('comparisonView');
    if (!comparisonView) return;
    
    if (previousMonthExpenses.length === 0) {
        comparisonView.innerHTML = '<p style="color: var(--text-secondary);">Add expenses for at least 2 months to see comparison.</p>';
        return;
    }
    
    const currentMonthName = new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const previousMonthName = new Date(previousMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    
    comparisonView.innerHTML = `
        <div class="comparison-grid">
            <div class="comparison-item">
                <div class="comparison-label">${currentMonthName}</div>
                <div class="comparison-value">₹${currentTotal.toFixed(2)}</div>
                <div class="comparison-change ${difference <= 0 ? 'positive' : 'negative'}">
                    ${difference <= 0 ? '↓' : '↑'} ${Math.abs(percentageChange).toFixed(1)}% vs last month
                </div>
            </div>
            <div class="comparison-item">
                <div class="comparison-label">${previousMonthName}</div>
                <div class="comparison-value">₹${previousTotal.toFixed(2)}</div>
            </div>
            <div class="comparison-item">
                <div class="comparison-label">Difference</div>
                <div class="comparison-value" style="color: ${difference <= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">
                    ${difference > 0 ? '+' : ''}₹${difference.toFixed(2)}
                </div>
                <div class="comparison-change">
                    ${difference <= 0 ? '🎉 Spending less!' : '⚠️ Spending more'}
                </div>
            </div>
        </div>
    `;
}

function getPreviousMonthString(currentMonth) {
    const [year, month] = currentMonth.split('-').map(Number);
    if (month === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
}

// ============================================
// SEARCH & FILTER
// ============================================

function searchAndFilterExpenses() {
    const searchInput = document.getElementById('searchExpenses');
    const categorySelect = document.getElementById('filterCategory');
    const monthInput = document.getElementById('filterMonth');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categorySelect ? categorySelect.value : 'all';
    const month = monthInput ? monthInput.value : '';
    
    let filtered = expenses;
    
    if (searchTerm) {
        filtered = filtered.filter(exp => 
            exp.description.toLowerCase().includes(searchTerm) ||
            exp.category.toLowerCase().includes(searchTerm) ||
            exp.amount.toString().includes(searchTerm)
        );
    }
    
    if (category !== 'all') {
        filtered = filtered.filter(exp => exp.category === category);
    }
    
    if (month) {
        filtered = filtered.filter(exp => exp.date.startsWith(month));
    }
    
    displayExpenses(filtered);
}

function filterExpenses() {
    searchAndFilterExpenses();
}

// ============================================
// EXPORT
// ============================================

function exportToCSV() {
    if (expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Recurring'];
    const rows = expenses.map(exp => [
        exp.date,
        exp.category,
        exp.description,
        exp.amount,
        exp.recurring ? 'Yes' : 'No'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('Expenses exported successfully!', 'success');
}

// ============================================
// TEMPLATES
// ============================================

function loadTemplates() {
    const stored = localStorage.getItem('expenseTemplates');
    templates = stored ? JSON.parse(stored) : [];
    displayTemplates();
}

function saveTemplates() {
    localStorage.setItem('expenseTemplates', JSON.stringify(templates));
}

function displayTemplates() {
    const templatesList = document.getElementById('templatesList');
    if (!templatesList) return;
    
    if (templates.length === 0) {
        templatesList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Create quick-add templates for common expenses!</p>';
        return;
    }
    
    templatesList.innerHTML = templates.map((template, index) => `
        <button class="template-btn" onclick="applyTemplate(${index})">
            ${getCategoryIcon(template.category)} ${template.name} - ₹${template.amount}
            <span class="template-delete" onclick="event.stopPropagation(); deleteTemplate(${index})">×</span>
        </button>
    `).join('');
}

function showTemplateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3>Create Quick-Add Template</h3>
            <form id="templateForm">
                <div class="form-group">
                    <label>Template Name</label>
                    <input type="text" id="templateName" required placeholder="e.g., Morning Coffee, Lunch">
                </div>
                <div class="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" id="templateAmount" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="templateCategory" required>
                        <option value="Food">🍔 Food</option>
                        <option value="Transport">🚗 Transport</option>
                        <option value="Entertainment">🎬 Entertainment</option>
                        <option value="Shopping">🛍️ Shopping</option>
                        <option value="Bills">💡 Bills</option>
                        <option value="Health">🏥 Health</option>
                        <option value="Education">📚 Education</option>
                        <option value="Other">📦 Other</option>
                    </select>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Create Template</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.getElementById('templateForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const template = {
            name: document.getElementById('templateName').value,
            amount: parseFloat(document.getElementById('templateAmount').value),
            category: document.getElementById('templateCategory').value
        };
        
        templates.push(template);
        saveTemplates();
        displayTemplates();
        modal.remove();
        showToast('Template created successfully!', 'success');
    });
}

function applyTemplate(index) {
    const template = templates[index];
    
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    
    if (amountInput) amountInput.value = template.amount;
    if (categoryInput) categoryInput.value = template.category;
    if (descriptionInput) descriptionInput.value = template.name;
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    const formCard = document.querySelector('.add-expense-section');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        formCard.style.transform = 'scale(1.02)';
        formCard.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.3)';
        setTimeout(() => {
            formCard.style.transform = '';
            formCard.style.boxShadow = '';
        }, 300);
    }
    
    showToast(`Template "${template.name}" applied! Click Add Expense to save.`, 'info');
}

function deleteTemplate(index) {
    if (confirm('Delete this template?')) {
        templates.splice(index, 1);
        saveTemplates();
        displayTemplates();
        showToast('Template deleted', 'success');
    }
}

// ============================================
// DARK MODE
// ============================================

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    
    const btn = document.getElementById('darkModeToggle');
    if (btn) {
        btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    }
    
    // Re-render charts with new colors
    setTimeout(() => {
        updateCategoryBreakdown();
        updateSpendingChart();
    }, 100);
}

function checkDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('darkModeToggle');
        if (btn) btn.textContent = '☀️';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCategoryIcon(category) {
    const icons = {
        'Food': '🍔',
        'Transport': '🚗',
        'Entertainment': '🎬',
        'Shopping': '🛍️',
        'Bills': '💡',
        'Health': '🏥',
        'Education': '📚',
        'Other': '📦'
    };
    return icons[category] || '📦';
}

function showNotification(message, type) {
    showToast(message, type);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
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
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// LOADING OVERLAY
// ============================================

function showLoading() {
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

console.log('Script.js loaded successfully');