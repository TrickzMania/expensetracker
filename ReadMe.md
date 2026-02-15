# 💰 Personal Expense Tracker

A modern, feature-rich web application for tracking personal expenses with real-time analytics, budget management, and cloud sync.

## ✨ Features

### Core Features ✅
- ✅ **Add/Edit/Delete Expenses** - Track all your spending
- ✅ **Categories** - Organize by Food, Transport, Entertainment, etc.
- ✅ **Date Tracking** - Know exactly when you spent
- ✅ **Recurring Expenses** - Mark bills and subscriptions

### Budget Management 💸
- ✅ **Set Monthly Budget** - Define spending limits
- ✅ **Progress Bar** - Visual budget tracking
- ✅ **Alerts** - Get warned at 80% and when exceeded
- ✅ **Remaining Calculator** - See how much you have left

### Analytics & Insights 📊
- ✅ **Total Spending** - Real-time totals
- ✅ **Category Breakdown** - See where money goes (Pie chart)
- ✅ **Spending Over Time** - Line graph of daily spending
- ✅ **Smart Insights** - AI-generated spending tips
  - Highest spending category
  - Average daily spending
  - Daily budget recommendations

### Data Management 💾
- ✅ **Firebase Sync** - Cloud storage & real-time sync
- ✅ **Export to CSV** - Download your data
- ✅ **Local Storage Fallback** - Works without Firebase
- ✅ **Filter by Category** - View specific categories
- ✅ **Filter by Month** - Time-based filtering

### User Experience 🎨
- ✅ **Dark Mode** - Easy on the eyes
- ✅ **Responsive Design** - Works on mobile, tablet, desktop
- ✅ **Modern UI** - Clean, intuitive interface
- ✅ **Real-time Updates** - Instant feedback

## 🚀 Quick Start

### Option 1: Run Locally (Easiest)

1. **Download the files** to a folder
2. **Open with VS Code**
3. **Install Live Server extension** (if not already installed)
4. **Right-click** `index.html` → "Open with Live Server"
5. **Start tracking!** (Uses localStorage - no Firebase needed)

### Option 2: With Firebase (Cloud Sync)

1. Follow steps in `FIREBASE_SETUP.md`
2. Update `script.js` with your Firebase config
3. Open with Live Server
4. Data syncs to cloud!

## 📁 Project Structure

```
expense-tracker/
├── index.html          # Main HTML structure
├── style.css           # Modern styling with dark mode
├── script.js           # All functionality + Firebase
├── FIREBASE_SETUP.md   # Firebase configuration guide
└── README.md           # This file
```

## 🛠️ Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling (with CSS variables for theming)
- **JavaScript (ES6+)** - Logic and interactivity
- **Firebase Firestore** - Cloud database
- **Chart.js** - Beautiful charts and graphs
- **LocalStorage API** - Offline fallback

## 📱 Browser Support

Works on all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🎯 How to Use

### Adding an Expense
1. Fill in amount, category, description, and date
2. Check "Recurring" if it's a regular expense
3. Click "Add Expense"

### Setting a Budget
1. Enter your monthly budget amount
2. Click "Set Budget"
3. Watch the progress bar update automatically

### Viewing Analytics
- Scroll down to see:
  - Category breakdown (pie chart)
  - Spending over time (line graph)
  - Smart insights

### Filtering
- Use dropdown to filter by category
- Use date picker to filter by month

### Exporting Data
- Click "Export" button in header
- Downloads a CSV file with all expenses

### Dark Mode
- Click moon/sun icon in header
- Preference saved automatically

## 🔧 Customization

### Adding New Categories
Edit `index.html` lines 49-57 (select dropdown) and `script.js` line 503 (icons)

### Changing Colors
Edit CSS variables in `style.css` lines 7-16 (light mode) and 19-26 (dark mode)

### Currency
Change `₹` to your currency symbol in `script.js` (search and replace)

## 📊 Features Breakdown

### Implemented ✅
- [x] Track total spending
- [x] Graphs showing spending over time
- [x] Category-wise breakdown
- [x] Most spent category insights
- [x] Spending insights
- [x] Set monthly budget
- [x] Warning when nearing limit
- [x] Alert when exceeded
- [x] Remaining budget calculator
- [x] Recurring expenses tracking
- [x] Export as CSV
- [x] Cloud sync (Firebase)
- [x] Dark mode
- [x] Responsive UI
- [x] Progress bars
- [x] Filter by category
- [x] Filter by month

### Future Enhancements (If Time Permits)
- [ ] User authentication (multi-user support)
- [ ] Budget templates
- [ ] Custom expense templates
- [ ] Income tracking
- [ ] Savings goal tracker with progress
- [ ] Bill reminders
- [ ] Receipt photo upload
- [ ] Export as PDF
- [ ] Weekly/monthly reports
- [ ] Comparison charts (month over month)

## 🐛 Known Issues / Limitations

1. **Firebase Rules** - Currently in test mode (public read/write). Need to add authentication for production.
2. **Single User** - No authentication means all data is shared. Add auth for multi-user support.
3. **No Image Upload** - Can't attach receipts yet.
4. **Browser Storage Limit** - LocalStorage has ~5-10MB limit.

## 💡 Tips

1. **Set Budget First** - Get the most value from analytics
2. **Use Categories Consistently** - Better insights
3. **Mark Recurring Expenses** - Track subscriptions easily
4. **Export Regularly** - Backup your data
5. **Try Dark Mode** - Especially at night!

## 🎓 Learning Notes

This project demonstrates:
- CRUD operations (Create, Read, Update, Delete)
- Firebase integration
- Chart.js implementation
- LocalStorage as fallback
- Responsive design principles
- CSS variables for theming
- ES6+ JavaScript features
- Event handling
- DOM manipulation
- Data filtering and sorting

## 📝 License

Free to use for personal and educational purposes.

## 🤝 Contributing

This is a learning project! Feel free to:
- Add features
- Fix bugs
- Improve design
- Optimize code

## 📞 Support

If you run into issues:
1. Check browser console (F12) for errors
2. Review `FIREBASE_SETUP.md` for Firebase issues
3. Make sure Live Server is running
4. Clear browser cache and reload

---

**Built with ❤️ for learning web development**

Happy expense tracking! 💰📊