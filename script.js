// ============================================
// PERSONAL EXPENSE TRACKER - FIXED SCRIPT
// With Landing Page + Auth + Main App
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
// PAGE TRANSITIONS
// ============================================

function enterAuth() {
    const hero = document.getElementById('hero-landing');
    const auth = document.getElementById('auth-container');
    
    // Slide hero up
    hero.classList.add('slide-up');
    
    // Show auth after animation
    setTimeout(() => {
        hero.style.display = 'none'; // CRITICAL: Remove from DOM
        auth.style.display = 'flex';
        setTimeout(() => auth.style.opacity = '1', 50);
    }, 800);
}

function backToHero() {
    const hero = document.getElementById('hero-landing');
    const auth = document.getElementById('auth-container');
    
    auth.style.opacity = '0';
    setTimeout(() => {
        auth.style.display = 'none';
        hero.style.display = 'flex';
        hero.classList.remove('slide-up');
    }, 500);
}

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        tabs[1].classList.add('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

function showMainApp() {
    const auth = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app-container');
    
    auth.style.opacity = '0';
    setTimeout(() => {
        auth.style.display = 'none';
        mainApp.style.display = 'block';
        initializeApp();
    }, 500);
}

// ============================================
// AUTHENTICATION
// ============================================

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email
                };
                // Skip landing/auth, go straight to app
                document.getElementById('hero-landing').style.display = 'none';
                document.getElementById('auth-container').style.display = 'none';
                document.getElementById('main-app-container').style.display = 'block';
                initializeApp();
            }
        });
    } else {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            document.getElementById('hero-landing').style.display = 'none';
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('main-app-container').style.display = 'block';
            initializeApp();
        }
    }
    
    // Setup form listeners
    setupAuthForms();
    createParticles();
});

function setupAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    
    btn.disabled = true;
    btn.textContent = 'Logging in...';
    
    if (!auth) {
        // localStorage mode
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        const user = users[email];
        
        if (user && user.password === password) {
            currentUser = { email, name: user.name, uid: user.uid };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Login successful!', 'success');
            showMainApp();
        } else {
            showToast('Invalid email or password', 'error');
            btn.disabled = false;
            btn.textContent = 'Log In';
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
        showMainApp();
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
        }
        
        showToast(errorMessage, 'error');
        btn.disabled = false;
        btn.textContent = 'Log In';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Creating Account...';
    
    if (!auth) {
        // localStorage mode
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        
        if (users[email]) {
            showToast('Account already exists. Please login.', 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
            return;
        }
        
        const uid = 'user_' + Date.now();
        users[email] = { name, password, uid };
        localStorage.setItem('users', JSON.stringify(users));
        
        currentUser = { email, name, uid };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showToast('Account created successfully!', 'success');
        showMainApp();
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: name });
        
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        });
        
        currentUser = {
            uid: user.uid,
            email: user.email,
            name: name
        };
        
        showToast('Account created successfully!', 'success');
        showMainApp();
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Account creation failed';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Account already exists. Please login.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password must be at least 6 characters';
                break;
        }
        
        showToast(errorMessage, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
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
// APP INITIALIZATION
// ============================================

function initializeApp() {
    console.log('Initializing app for user:', currentUser);
    
    if (currentUser) {
        const greeting = document.getElementById('userGreeting');
        if (greeting) {
            greeting.textContent = currentUser.name || currentUser.email;
        }
    }
    
    setTodayDate();
    displayCurrentMonth();
    loadBudget();
    loadTemplates();
    loadExpenses();
    setupEventListeners();
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
    const exportBtn = document.getElementById('exportBtn');
    const addTemplateBtn = document.getElementById('addTemplateBtn');
    const searchExpenses = document.getElementById('searchExpenses');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (expenseForm) {
        const newForm = expenseForm.cloneNode(true);
        expenseForm.parentNode.replaceChild(newForm, expenseForm);
        newForm.addEventListener('submit', addExpense);
    }
    
    if (setBudgetBtn && !setBudgetBtn.hasAttribute('data-listener')) {
        setBudgetBtn.setAttribute('data-listener', 'true');
        setBudgetBtn.addEventListener('click', setBudget);
    }
    
    if (exportBtn && !exportBtn.hasAttribute('data-listener')) {
        exportBtn.setAttribute('data-listener', 'true');
        exportBtn.addEventListener('click', exportToCSV);
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
            </div>
            <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-delete" onclick="deleteExpense('${expense.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    
    if (useFirebase && db) {
        try {
            await db.collection('expenses').doc(id).delete();
            await loadExpenses();
            showToast('Expense deleted!', 'success');
            return;
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    expenses = expenses.filter(exp => exp.id !== id);
    saveExpensesToLocalStorage();
    loadExpensesFromLocalStorage();
    showToast('Expense deleted!', 'success');
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
            categoryList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No expenses to display</p>';
        }
        // Clear chart if exists
        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
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
                    ],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f1f5f9',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return ` ${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                            }
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
    if (!ctx) return;
    
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
                            color: '#f1f5f9'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
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
// SEARCH & FILTER
// ============================================

function searchAndFilterExpenses() {
    const searchInput = document.getElementById('searchExpenses');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = expenses;
    
    if (searchTerm) {
        filtered = filtered.filter(exp => 
            exp.description.toLowerCase().includes(searchTerm) ||
            exp.category.toLowerCase().includes(searchTerm) ||
            exp.amount.toString().includes(searchTerm)
        );
    }
    
    displayExpenses(filtered);
}

// ============================================
// EXPORT
// ============================================

function exportToCSV() {
    if (expenses.length === 0) {
        showToast('No expenses to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Category', 'Description', 'Amount'];
    const rows = expenses.map(exp => [
        exp.date,
        exp.category,
        exp.description,
        exp.amount
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
    
    showToast('Expenses exported!', 'success');
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
        templatesList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Create quick templates!</p>';
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
    // Remove existing modal if any
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
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
                    <button type="button" class="btn-secondary" onclick="closeTemplateModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Create Template</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeTemplateModal();
    });
    
    // Handle form submission
    const form = document.getElementById('templateForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const template = {
            name: document.getElementById('templateName').value,
            amount: parseFloat(document.getElementById('templateAmount').value),
            category: document.getElementById('templateCategory').value
        };
        
        templates.push(template);
        saveTemplates();
        displayTemplates();
        closeTemplateModal();
        showToast('Template created successfully!', 'success');
    });
    
    // Focus first input
    setTimeout(() => {
        const firstInput = document.getElementById('templateName');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeTemplateModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
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
    
    // Scroll to form
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
    
    showToast(`Template "${template.name}" applied!`, 'info');
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

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.style.cssText = `
        background: var(--card-bg);
        border-left: 4px solid var(--primary-color);
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        min-width: 300px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <span>${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// PARTICLES
// ============================================

function createParticles() {
    const container = document.getElementById('particle-container');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

console.log('Script.js loaded successfully');