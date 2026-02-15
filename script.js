// =========================================================
// PART 1: HERO, AUTH & NAVIGATION (NEW LOGIC)
// =========================================================

// Global Variables (App State)
let expenses = [];
let monthlyBudget = 0;
let categoryChart = null;
let spendingChart = null;
let templates = [];
let editingExpenseId = null;
let currentUser = null;

// Initialize App & Auth Listeners
document.addEventListener('DOMContentLoaded', () => {
    createParticles(); // Start hero animations
    
    // Check Authentication Status immediately
    if (typeof firebase !== 'undefined' && firebase.auth()) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is logged in: Skip Hero, Show App
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email
                };
                showMainApp(currentUser);
            } else {
                // User is NOT logged in: Show Hero
                document.getElementById('hero-landing').style.display = 'flex';
            }
        });
    } else {
        // Fallback if Firebase isn't loaded (e.g., offline)
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            showMainApp(currentUser);
        } else {
            document.getElementById('hero-landing').style.display = 'flex';
        }
    }
});

// Trigger Curtain Effect & Show Auth Layer
function enterAuth() {
    const hero = document.getElementById('hero-landing');
    const auth = document.getElementById('auth-container');
    
    // 1. Slide Hero Up
    hero.classList.add('slide-up');
    
    // 2. Show Auth Layer after small delay
    setTimeout(() => {
        auth.style.display = 'flex';
        // Trigger reflow for transition
        void auth.offsetWidth; 
        auth.style.opacity = '1';
    }, 400);
}

// Back Button Logic (Return to Hero)
function backToHero() {
    const hero = document.getElementById('hero-landing');
    const auth = document.getElementById('auth-container');
    
    auth.style.opacity = '0';
    setTimeout(() => {
        auth.style.display = 'none';
        hero.classList.remove('slide-up');
    }, 500);
}

// Switch between Login and Signup tabs
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const btns = document.querySelectorAll('.tab-btn');
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        signupForm.classList.add('active');
        btns[0].classList.remove('active');
        btns[1].classList.add('active');
    }
}

// Reveal Main Dashboard
function showMainApp(user) {
    // Hide Hero & Auth Layers
    const hero = document.getElementById('hero-landing');
    const auth = document.getElementById('auth-container');
    
    if(hero) hero.style.display = 'none';
    if(auth) auth.style.display = 'none';
    
    // Show Main App Container
    const app = document.getElementById('main-app-container');
    app.style.display = 'block';
    
    // Update Header with User Info
    const greeting = document.getElementById('userGreeting');
    if(greeting) {
        greeting.innerText = user.name || user.email.split('@')[0];
    }
    
    // Initialize App Data
    initializeApp();
}

// Particle Effects Generator
function createParticles() {
    const container = document.getElementById('particle-container');
    if(!container) return;
    
    // Clear existing particles if any
    container.innerHTML = '';

    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 10 + 10) + 's';
        p.style.opacity = Math.random() * 0.5;
        container.appendChild(p);
    }
}

// --- AUTH EVENT HANDLERS ---

// Handle Login Submit
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button');
        
        btn.textContent = 'Logging in...';
        btn.disabled = true;
        
        firebase.auth().signInWithEmailAndPassword(email, pass)
            .then((cred) => {
                showToast('Welcome back!', 'success');
                // showMainApp is handled by onAuthStateChanged
            })
            .catch((err) => {
                showToast(err.message, 'error');
                btn.textContent = 'Log In';
                btn.disabled = false;
            });
    });
}

// Handle Signup Submit
const signupForm = document.getElementById('signupForm');
if(signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const pass = document.getElementById('signupPassword').value;
        const btn = signupForm.querySelector('button');
        
        btn.textContent = 'Creating Account...';
        btn.disabled = true;
        
        firebase.auth().createUserWithEmailAndPassword(email, pass)
            .then((cred) => {
                return cred.user.updateProfile({ displayName: name })
                    .then(() => {
                        showToast('Account created!', 'success');
                        // showMainApp is handled by onAuthStateChanged
                    });
            })
            .catch((err) => {
                showToast(err.message, 'error');
                btn.textContent = 'Create Account';
                btn.disabled = false;
            });
    });
}

// Handle Logout
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to logout?')) {
            firebase.auth().signOut().then(() => {
                location.reload(); // Reloads page to show Hero animation again
            });
        }
    });
}


// =========================================================
// PART 2: EXPENSE TRACKER LOGIC (CORE FUNCTIONALITY)
// =========================================================

function initializeApp() {
    console.log('Initializing app logic...');
    
    setTodayDate();
    displayCurrentMonth();
    loadBudget();
    loadTemplates();
    loadExpenses(); // This now checks Firebase or LocalStorage based on auth
    setupEventListeners();
    
    // Force chart render
    setTimeout(() => {
        if (expenses.length > 0) {
            updateCategoryBreakdown();
            updateSpendingChart();
        }
    }, 500);
}

function setupEventListeners() {
    const expenseForm = document.getElementById('expenseForm');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const exportBtn = document.getElementById('exportBtn');
    const searchExpenses = document.getElementById('searchExpenses');
    const addTemplateBtn = document.getElementById('addTemplateBtn');
    
    // Clean and attach listeners
    if (expenseForm) {
        const newForm = expenseForm.cloneNode(true);
        expenseForm.parentNode.replaceChild(newForm, expenseForm);
        newForm.addEventListener('submit', addExpense);
    }
    
    if (setBudgetBtn) setBudgetBtn.onclick = setBudget;
    if (exportBtn) exportBtn.onclick = exportToCSV;
    if (addTemplateBtn) addTemplateBtn.onclick = showTemplateModal;
    
    if (searchExpenses) {
        searchExpenses.addEventListener('input', searchAndFilterExpenses);
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
// EXPENSE CRUD
// ============================================

async function addExpense(e) {
    e.preventDefault();
    
    if (editingExpenseId) {
        await updateExpense();
        return;
    }
    
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const descriptionInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    const recurringInput = document.getElementById('recurring');
    
    const expense = {
        amount: parseFloat(amountInput.value),
        category: categoryInput.value,
        description: descriptionInput.value,
        date: dateInput.value,
        recurring: recurringInput ? recurringInput.checked : false,
        userId: currentUser ? currentUser.uid : 'local',
        timestamp: new Date().toISOString()
    };
    
    if (currentUser && typeof db !== 'undefined') {
        try {
            await db.collection('expenses').add(expense);
            resetExpenseForm();
            await loadExpenses();
            showToast('Expense added!', 'success');
        } catch (error) {
            console.error('Firebase error:', error);
            showToast('Error adding expense', 'error');
        }
    } else {
        // Local Fallback
        expense.id = Date.now().toString();
        expenses.push(expense);
        saveExpensesToLocalStorage();
        resetExpenseForm();
        refreshAllDisplays();
        showToast('Expense added (Local)', 'success');
    }
}

async function loadExpenses() {
    if (currentUser && typeof db !== 'undefined') {
        try {
            const snapshot = await db.collection('expenses')
                .where('userId', '==', currentUser.uid)
                .orderBy('date', 'desc')
                .get();
                
            expenses = [];
            snapshot.forEach(doc => {
                expenses.push({ id: doc.id, ...doc.data() });
            });
            refreshAllDisplays();
        } catch (error) {
            console.error('Error loading:', error);
        }
    } else {
        loadExpensesFromLocalStorage();
    }
}

function loadExpensesFromLocalStorage() {
    const userId = currentUser ? currentUser.uid : 'local';
    const stored = localStorage.getItem(`expenses_${userId}`);
    expenses = stored ? JSON.parse(stored) : [];
    refreshAllDisplays();
}

function saveExpensesToLocalStorage() {
    const userId = currentUser ? currentUser.uid : 'local';
    localStorage.setItem(`expenses_${userId}`, JSON.stringify(expenses));
}

function refreshAllDisplays() {
    displayExpenses(expenses);
    updateSummary();
    updateCategoryBreakdown();
    updateSpendingChart();
    // generateInsights(); // Uncomment if insights logic exists
    // generateMonthComparison(); // Uncomment if comparison logic exists
}

function displayExpenses(expensesToDisplay) {
    const list = document.getElementById('expensesList');
    if (!list) return;
    
    if (!expensesToDisplay || expensesToDisplay.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <p>No expenses found. Start tracking!</p>
            </div>`;
        return;
    }
    
    list.innerHTML = expensesToDisplay.map(exp => `
        <div class="expense-item">
            <div class="expense-info">
                <h4>${exp.description}</h4>
                <p>${new Date(exp.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                <span class="expense-category">${getCategoryIcon(exp.category)} ${exp.category}</span>
                ${exp.recurring ? '<span class="expense-category" style="background: #8b5cf6;">🔄 Recurring</span>' : ''}
            </div>
            <div class="expense-amount">₹${exp.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-edit" onclick="editExpense('${exp.id}')">✏️</button>
                <button class="btn-delete" onclick="deleteExpense('${exp.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    
    if (currentUser && typeof db !== 'undefined') {
        try {
            await db.collection('expenses').doc(id).delete();
            await loadExpenses();
            showToast('Expense deleted', 'success');
        } catch(e) { console.error(e); }
    } else {
        expenses = expenses.filter(e => e.id !== id);
        saveExpensesToLocalStorage();
        refreshAllDisplays();
        showToast('Expense deleted', 'success');
    }
}

function editExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    
    document.getElementById('amount').value = exp.amount;
    document.getElementById('category').value = exp.category;
    document.getElementById('description').value = exp.description;
    document.getElementById('date').value = exp.date;
    const recurring = document.getElementById('recurring');
    if(recurring) recurring.checked = exp.recurring;
    
    editingExpenseId = id;
    
    const btn = document.querySelector('#expenseForm button[type="submit"]');
    btn.textContent = 'Update Expense';
    
    // Scroll to form
    document.querySelector('.add-expense-section').scrollIntoView({behavior: 'smooth'});
}

async function updateExpense() {
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;
    const recurring = document.getElementById('recurring').checked;
    
    const updatedData = {
        amount, category, description, date, recurring,
        userId: currentUser.uid,
        timestamp: new Date().toISOString()
    };
    
    if (currentUser && typeof db !== 'undefined') {
        await db.collection('expenses').doc(editingExpenseId).update(updatedData);
        await loadExpenses();
    } else {
        const index = expenses.findIndex(e => e.id === editingExpenseId);
        if(index !== -1) {
            expenses[index] = { ...expenses[index], ...updatedData };
            saveExpensesToLocalStorage();
            refreshAllDisplays();
        }
    }
    
    resetExpenseForm();
    showToast('Expense updated', 'success');
}

function resetExpenseForm() {
    document.getElementById('expenseForm').reset();
    setTodayDate();
    const btn = document.querySelector('#expenseForm button[type="submit"]');
    btn.textContent = 'Add Expense';
    editingExpenseId = null;
}

// ============================================
// BUDGET & CHARTS
// ============================================

function setBudget() {
    const input = document.getElementById('budgetInput');
    const val = parseFloat(input.value);
    if (val > 0) {
        monthlyBudget = val;
        localStorage.setItem('monthlyBudget', val);
        updateSummary();
        showToast('Budget set!', 'success');
    }
}

function loadBudget() {
    const stored = localStorage.getItem('monthlyBudget');
    if (stored) {
        monthlyBudget = parseFloat(stored);
        document.getElementById('budgetInput').value = monthlyBudget;
        updateSummary();
    }
}

function updateSummary() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
    const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = monthlyBudget - total;
    
    document.getElementById('totalSpending').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('monthlyBudget').textContent = `₹${monthlyBudget.toFixed(2)}`;
    
    const remainingEl = document.getElementById('remaining');
    remainingEl.textContent = `₹${remaining.toFixed(2)}`;
    remainingEl.style.color = remaining < 0 ? 'var(--danger-color)' : 'var(--success-color)';
    
    // Progress Bar
    const progress = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const container = document.getElementById('budgetProgress');
    
    if (monthlyBudget > 0) {
        container.style.display = 'block';
        const pct = Math.min((total / monthlyBudget) * 100, 100);
        progress.style.width = `${pct}%`;
        progressText.textContent = `${pct.toFixed(1)}%`;
        
        // Remove old classes
        progress.classList.remove('warning', 'danger');
        if(pct > 90) progress.classList.add('danger');
        else if(pct > 75) progress.classList.add('warning');
    }
}

function updateCategoryBreakdown() {
    // Basic implementation for breakdown
    if(expenses.length === 0) return;
    
    const totals = {};
    expenses.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    
    // Render Chart
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (categoryChart) categoryChart.destroy();
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(totals),
            datasets: [{
                data: Object.values(totals),
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } }
            }
        }
    });
}

function updateSpendingChart() {
    const ctx = document.getElementById('spendingChart');
    if (!ctx || expenses.length === 0) return;
    
    const daily = {};
    expenses.forEach(e => {
        daily[e.date] = (daily[e.date] || 0) + e.amount;
    });
    
    const sortedDates = Object.keys(daily).sort();
    const data = sortedDates.map(d => daily[d]);
    
    if (spendingChart) spendingChart.destroy();
    
    spendingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(d => new Date(d).toLocaleDateString(undefined, {month:'short', day:'numeric'})),
            datasets: [{
                label: 'Spending',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ============================================
// TEMPLATES & EXPORT
// ============================================

function loadTemplates() {
    const stored = localStorage.getItem('expenseTemplates');
    templates = stored ? JSON.parse(stored) : [];
    renderTemplates();
}

function renderTemplates() {
    const list = document.getElementById('templatesList');
    if(!list) return;
    
    if(templates.length === 0) {
        list.innerHTML = '<span style="color:var(--text-secondary); font-size: 0.9rem;">No templates yet.</span>';
        return;
    }
    
    list.innerHTML = templates.map((t, i) => `
        <button class="template-btn" onclick="applyTemplate(${i})">
            ${getCategoryIcon(t.category)} ${t.name}
            <span class="template-delete" onclick="event.stopPropagation(); deleteTemplate(${i})">×</span>
        </button>
    `).join('');
}

function showTemplateModal() {
    const name = prompt("Template Name (e.g., Coffee):");
    if(!name) return;
    const amount = prompt("Amount:");
    const category = prompt("Category (Food, Transport, etc.):");
    
    templates.push({ name, amount: parseFloat(amount), category });
    localStorage.setItem('expenseTemplates', JSON.stringify(templates));
    renderTemplates();
    showToast('Template added', 'success');
}

function applyTemplate(index) {
    const t = templates[index];
    document.getElementById('amount').value = t.amount;
    document.getElementById('category').value = t.category;
    document.getElementById('description').value = t.name;
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    showToast('Template applied', 'info');
}

function deleteTemplate(index) {
    if(confirm('Delete template?')) {
        templates.splice(index, 1);
        localStorage.setItem('expenseTemplates', JSON.stringify(templates));
        renderTemplates();
    }
}

function exportToCSV() {
    if (expenses.length === 0) return showToast('Nothing to export', 'error');
    
    const headers = ['Date', 'Category', 'Description', 'Amount'];
    const rows = expenses.map(e => [e.date, e.category, e.description, e.amount]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(r => csv += r.join(',') + '\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
}

function searchAndFilterExpenses() {
    const term = document.getElementById('searchExpenses').value.toLowerCase();
    const filtered = expenses.filter(e => 
        e.description.toLowerCase().includes(term) || 
        e.category.toLowerCase().includes(term)
    );
    displayExpenses(filtered);
}

// ============================================
// UTILS
// ============================================

function getCategoryIcon(category) {
    const icons = {
        'Food': '🍔', 'Transport': '🚗', 'Entertainment': '🎬',
        'Shopping': '🛍️', 'Bills': '💡', 'Health': '🏥',
        'Education': '📚', 'Other': '📦'
    };
    return icons[category] || '📦';
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}