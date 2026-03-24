  // ------------------------------
  // GLOBAL VARIABLES
  // ------------------------------
  const user_id = localStorage.getItem("user_id");
    let pieChartInstance = null;
    let myBarChart = null;

    const formatPHP = (val) => `₱ ${(parseFloat(val) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

  const incomeEls = {
    starting_money: document.getElementById("starting_money"),
    salary: document.getElementById("salary"),
    freelance: document.getElementById("freelance"),
    business: document.getElementById("business"),
    monthly: document.getElementById("monthly_income")
  };

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Security Check
    if (!user_id) {
        window.location.href = "Log-in.html";
        return;
    }
    if (!document.querySelector(".dashboard")) return;

    // 2. Personalization
    const username = localStorage.getItem("display_name"); 
    const userEl = document.getElementById("display-username");
    if (userEl && username) userEl.textContent = username;
      
    // 3. UI Setup
    setCurrentDate(); 
    setupAllModals();
    setupDropdowns();
    setupExpenseModal();
    setupIncomeModal();

    // 4. Data Loading
    const currentMonth = new Date().getMonth() + 1;
    await filterByMonth(currentMonth); 
    
    // 5. Transition
    if (typeof whiteScreenTransition === "function") {
        whiteScreenTransition();
    }
});

    async function initializeDashboard() {
        console.log("Initializing Dashboard...");
        try {
            await updateDashboard();
            await loadExpenseTotals();
        } catch (err) {
            console.error("Dashboard failed:", err);
        }
    }

const viewPresentBtn = document.getElementById("view-present-btn");
if (viewPresentBtn) {
    viewPresentBtn.addEventListener("click", () => {
        const labelElement = document.querySelector('.dropdown-label');
        if (labelElement) {
            labelElement.textContent = "View History";
            labelElement.style.color = ""; 
        }
        initializeDashboard(); 
    });
}

  // ------------------------------
  // DATA FETCHING FUNCTIONS
  // ------------------------------
async function loadExpenseTotals(selectedMonth = null) {
    const user_id = localStorage.getItem("user_id");
    const month = selectedMonth || (new Date().getMonth() + 1);
    const year = new Date().getFullYear();

    try {
        // 1. Fetch Expense Data
        const expRes = await fetch(`http://localhost:3000/expenses-data/${user_id}?month=${month}&year=${year}`);
        const expenseData = await expRes.json();

        // 2. Fetch Income 
        const incRes = await fetch(`http://localhost:3000/income-summary/${user_id}`);
        const incomeData = await incRes.json();
        currentIncome = incomeData; 

        const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
        
        const formatPHP = (val) => `₱ ${(parseFloat(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

        categories.forEach(cat => {
            const val = parseFloat(expenseData[cat]) || 0;

            // update Category Value
            const element = document.getElementById(cat);
            if (element) element.textContent = formatPHP(val);

            // update LEGEND
            const legElement = document.getElementById(`leg-${cat}`);
            if (legElement) legElement.textContent = formatPHP(val);
        });

        // 3. update "Total Expenses" Card
        const totalEl = document.getElementById("total-expense-value");
        if (totalEl) {
            totalEl.textContent = formatPHP(expenseData.total_expense);
        }

        // 4. Trigger Charts & Analytics
        renderPieChart(expenseData);
        calculateFinancialInsights(expenseData); 
        updateCashFlowStatus(expenseData);
        
        await updateMonthlyOverview(month);

    } catch (err) {
        console.error("Dashboard Expense Sync Error:", err);
    }
}

  // -----------------------------
  // DATA FETCHING
  // -----------------------------
  function fetchStartingMoney() {
    fetch(`http://localhost:3000/dashboard/${user_id}`)
      .then(res => res.json())
      .then(data => {
        console.log("Response from server:", data);
        const start = Number(data.starting_balance || 0);
        const el = document.getElementById("starting_money");
        if (el) {
          el.textContent = start.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        }
      })
      .catch(err => console.error("Error starting money:", err));
  }

//for INCOMEEEEEE
async function updateDashboard() {
    const user_id = localStorage.getItem("user_id");
    if (!user_id) return;

    try {
        const res = await fetch(`http://localhost:3000/income-summary/${user_id}`);
        const data = await res.json();

        if (data.status === "success") {
            const formatPHP = (val) => `₱ ${(parseFloat(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            const total = (data.salary || 0) + (data.freelance || 0) + (data.business || 0) + (data.starting_money || 0);

            // Update Top Summary
            if (document.getElementById("monthly_income")) document.getElementById("monthly_income").textContent = formatPHP(total);
            if (document.getElementById("starting_money")) document.getElementById("starting_money").textContent = formatPHP(data.starting_money);
            
            // Update Income Breakdown
            if (document.getElementById("salary")) document.getElementById("salary").textContent = formatPHP(data.salary);
            if (document.getElementById("freelance")) document.getElementById("freelance").textContent = formatPHP(data.freelance);
            if (document.getElementById("business")) document.getElementById("business").textContent = formatPHP(data.business);

            // Update Transaction List
            if (document.getElementById("display-salary")) document.getElementById("display-salary").textContent = formatPHP(data.salary);
            if (document.getElementById("display-freelance")) document.getElementById("display-freelance").textContent = formatPHP(data.freelance);
            if (document.getElementById("display-business")) document.getElementById("display-business").textContent = formatPHP(data.business);
            
            refreshCurrentBalance(); 
            
            currentIncome = data;
        }
    } catch (err) {
        console.error("Dashboard Sync Error:", err);
    }
}

function refreshCurrentBalance() {
    fetch(`http://localhost:3000/balance/${user_id}`)
      .then(res => res.json())
      .then(data => {
        if (data.status !== "success") return;
        const balanceEl = document.getElementById("current_balance");
        if (balanceEl) {
          balanceEl.textContent = parseFloat(data.balance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        }
      });
}

// ------------------------------
// UI UPDATE WORKERS
// ------------------------------
function updateCashFlowStatus(expenseTotals = {}) {
    const monthlyIncome = (currentIncome.salary || 0) + (currentIncome.freelance || 0) + 
                          (currentIncome.business || 0) + (currentIncome.starting_money || 0);    
    
    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    const finalTotal = categories.reduce((sum, cat) => sum + (parseFloat(expenseTotals[cat]) || 0), 0);

    // --- EXPENSES SECTION ---
    const expAmountEl = document.querySelector(".flow-amount.red");
    const expBar = document.querySelector(".progress-fill.progress-red");
    const expPctEl = document.querySelectorAll(".progress-pct")[0];

    if (expAmountEl) expAmountEl.textContent = `₱${finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    if (expBar) {
        const expPercent = monthlyIncome > 0 ? Math.min((finalTotal / monthlyIncome) * 100, 100) : 0;
        expBar.style.width = `${expPercent}%`;
        expBar.style.backgroundColor = "#ef4444";
    }
    if (expPctEl) {
        const pct = monthlyIncome > 0 ? ((finalTotal / monthlyIncome) * 100).toFixed(0) : 0;
        expPctEl.textContent = `${pct}% of income`;
    }

    // --- SAVINGS SECTION ---
    const savingsAmount = Math.max(0, monthlyIncome - finalTotal);
    const savingsAmountEl = document.querySelector(".flow-amount.green");
    const savingsBar = document.querySelector(".progress-fill.progress-green");
    const savingsPctEl = document.querySelectorAll(".progress-pct")[1];

    if (savingsAmountEl) savingsAmountEl.textContent = `₱${savingsAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    if (savingsBar) {
        const savingsPercent = monthlyIncome > 0 ? (savingsAmount / monthlyIncome) * 100 : 0;
        savingsBar.style.width = `${savingsPercent}%`;
    }
    if (savingsPctEl) {
        const pct = monthlyIncome > 0 ? ((savingsAmount / monthlyIncome) * 100).toFixed(0) : 0;
        savingsPctEl.textContent = `${pct}% of income`;
    }
}

  function renderPieChart(totals) {
    const ctx = document.getElementById("pieChart")?.getContext("2d");
    if (!ctx) return;

    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    const data = categories.map(cat => parseFloat(totals[cat]) || 0);
      
    
    if (pieChartInstance) {
      pieChartInstance.data.datasets[0].data = data;
      pieChartInstance.update();
    } else {
      pieChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels: categories,
          datasets: [{ data, backgroundColor: ["#6366F1", "#F472B6", "#9F1239", "#FFCC00", "#F59E0B", "#A855F7"] }]
        },
        options: { 
          responsive: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  }


  function updateDonutTotal(totals) {
    const total = Object.values(totals).reduce((a, b) => a + parseFloat(b || 0), 0);
    const label = document.querySelector(".donut-lbl");
    if (label) label.textContent = `₱ ${total.toLocaleString()}`;
  }

async function initCharts(month = null, year = null) {
    const canvas = document.getElementById("mychart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const userId = localStorage.getItem("user_id");
    const currentYear = year || new Date().getFullYear();
    
    let url = `http://localhost:3000/api/monthly-stats/${userId}?year=${currentYear}`;
    if (month) url += `&month=${month}`; 

    try {
        const response = await fetch(url);
        const dbData = await response.json(); 

        // 1. DESTROY ONLY IF WE ARE ABOUT TO RENDER NEW DATA
        if (window.myBarChart) {
            window.myBarChart.destroy();
            window.myBarChart = null; 
        }

        // 2. BETTER EMPTY STATE
        let labels = dbData.labels || [];
        let incomeData = dbData.income || [];
        let expenseData = dbData.expenses || [];

        if (labels.length === 0) {
            labels = ["No Data"];
            incomeData = [0];
            expenseData = [0];
        } else if (!month) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
            labels = labels.map(label => {
                const monthNum = parseInt(label.replace("Month ", "")); 
                return monthNames[monthNum - 1] || label;
            });
        }

        // 3. RENDER
        window.myBarChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    { label: "Income", data: incomeData, backgroundColor: "#3b82f6", borderRadius: 4 },
                    { label: "Expenses", data: expenseData, backgroundColor: "#ef4444", borderRadius: 4 }
                ]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: { callback: (value) => '₱' + value.toLocaleString() } 
                    } 
                },
                plugins: {
                    legend: { display: true, position: 'top' }
                }
            }
        });
    } catch (err) {
        console.error("Chart Error:", err);
    }
}

  // -----------------------------
  // DROPDOWNS & MONTH SELECT
  // -----------------------------
function setupDropdown(btnId, menuId, cancelBtnId = null, onSelect = null) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  if (!btn || !menu) return;

  const label = btn.querySelector(".dropdown-label");
  const chevron = btn.querySelector(".chevron");

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const isNowHidden = !menu.hidden;
    menu.hidden = isNowHidden;
    btn.setAttribute("aria-expanded", String(!isNowHidden));
    if (chevron) chevron.style.transform = !isNowHidden ? "rotate(180deg)" : "";
  });

  menu.querySelectorAll(".drpdwn-option").forEach(opt => {
    opt.addEventListener("click", () => {
      menu.querySelectorAll(".drpdwn-option").forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      
      const selectionText = opt.textContent.trim();
      if (label) label.textContent = selectionText;

      // Importante: Ipapasa natin ang 'opt' para makuha ang data-month
      if (onSelect) onSelect(selectionText, opt); 

      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      if (chevron) chevron.style.transform = "";
    });
  });
}

function setupDropdowns() {
  // 1. Expenses
  setupDropdown("expenses-dropdown", "expenses-menu", "cancelExpense", (selection) => {});
  
  // 2. Income
  setupDropdown("income-dropdown", "income-menu", "cancelIncome", (selection) => {});

  // 3. Header (Month Filter)
  setupDropdown("header-dropdown", "header-menu", null, async (selection, opt) => {
    let monthNumber = opt.getAttribute("data-month");

    // Logic para sa "Present"
    if (selection === "Present" || !monthNumber) {
      monthNumber = new Date().getMonth() + 1;
    }

    console.log(`Action: Switch to Month ${monthNumber}`);
    
    // TAWAGIN ANG FILTER (One-click fix!)
    await filterByMonth(monthNumber);
  });
}

async function filterByMonth(monthNumber) {
    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[parseInt(monthNumber)];
    const currentYear = new Date().getFullYear();

    const label = document.querySelector('.dropdown-label');
    const currentBalanceEl = document.getElementById("current_balance"); 

    if (label) label.textContent = monthName;

    try {
        const res = await fetch(`http://localhost:3000/overview/filter/${monthNumber}?user_id=${user_id}&year=${currentYear}`);
        const result = await res.json();

        if (result.status === "success") {
            const inc = result.income_details || {};
            const exp = result.data || {}; 

            const chartHeader = document.querySelector('.monthly-overview h3');
            if (chartHeader) {
                chartHeader.textContent = monthNumber ? `${monthName} Overview` : "Yearly Overview";
            }

            // 1. UPDATE INCOME BOXES
            const totalInc = (parseFloat(inc.salary) || 0) + (parseFloat(inc.freelance) || 0) + (parseFloat(inc.business) || 0) + (parseFloat(inc.starting_money) || 0);
            
            currentIncome = { 
                salary: parseFloat(inc.salary) || 0, 
                freelance: parseFloat(inc.freelance) || 0, 
                business: parseFloat(inc.business) || 0, 
                starting_money: parseFloat(inc.starting_money) || 0 
            };

            if (incomeEls.monthly) incomeEls.monthly.textContent = formatPHP(totalInc);
            if (incomeEls.starting_money) incomeEls.starting_money.textContent = formatPHP(inc.starting_money);
            if (incomeEls.salary) incomeEls.salary.textContent = formatPHP(inc.salary);
            if (incomeEls.freelance) incomeEls.freelance.textContent = formatPHP(inc.freelance);
            if (incomeEls.business) incomeEls.business.textContent = formatPHP(inc.business);

            // 2. UPDATE TRANSACTION BREAKDOWN LIST
            const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
            categories.forEach(cat => {
                const val = exp[cat] || 0;
                const element = document.getElementById(cat);
                const legElement = document.getElementById(`leg-${cat}`);
                if (element) element.textContent = formatPHP(val);
                if (legElement) legElement.textContent = formatPHP(val);
            });

            // 3. UPDATE INCOME SOURCES LIST
            if (document.getElementById("display-salary")) document.getElementById("display-salary").textContent = formatPHP(inc.salary);
            if (document.getElementById("display-freelance")) document.getElementById("display-freelance").textContent = formatPHP(inc.freelance);
            if (document.getElementById("display-business")) document.getElementById("display-business").textContent = formatPHP(inc.business);

            // 4. CALCULATE TOTALS
            const totalExpenses = Object.values(exp).reduce((a, b) => a + (parseFloat(b) || 0), 0);
            const savingsAmount = totalInc - totalExpenses;
            const savingsRate = totalInc > 0 ? (savingsAmount / totalInc) * 100 : 0;

            // 5. UPDATE PROGRESS BARS (In-page mini cards)
            const expAmtEl = document.getElementById("total-expense-value");
            const expBar = document.querySelector(".progress-fill.progress-red");
            const savingsAmtEl = document.getElementById("savings-value");
            const savingsBar = document.querySelector(".progress-fill.progress-green");

            if (expAmtEl) expAmtEl.textContent = formatPHP(totalExpenses);
            if (expBar) expBar.style.width = `${Math.min((totalExpenses / (totalInc || 1)) * 100, 100)}%`;
            if (savingsAmtEl) savingsAmtEl.textContent = formatPHP(savingsAmount);
            if (savingsBar) savingsBar.style.width = `${Math.max(0, savingsRate)}%`;

            // 6. REFRESH CHARTS & INSIGHTS (Ito yung mga pwedeng mag-reset ng UI)
            initCharts(monthNumber, currentYear);
            updateMonthlyOverview(monthNumber);
            updateCashFlowStatus(exp);
            renderPieChart(exp);
            calculateFinancialInsights(exp);

            // 7. FINAL UI UPDATE: HULING MAGSASALITA (Force Update the Main Balance)
            if (currentBalanceEl) {
                const newVal = formatPHP(savingsAmount);
                if (currentBalanceEl.textContent !== newVal) {
                    currentBalanceEl.textContent = newVal;
                }
            }

        } else {
            resetDashboardToZero(); 
        }
    } catch (err) {
        console.error("Error switching months:", err);
        resetDashboardToZero();
    }
}

function filterDashboard() {
    const monthSelect = document.getElementById("monthFilter");
    const selectedMonth = monthSelect.value;
    console.log("DEBUG: Changing to month:", selectedMonth);

   // fetchDashboardTotals(selectedMonth); 
    filterByMonth(selectedMonth);
    updateMonthlyOverview(selectedMonth);
}

  // -----------------------------
  // MODALS
  // -----------------------------
  const modals = [
    { openBtn: "openLogout", modalId: "logoutModal", cancelId: "cancelLogout" },
    { openBtn: "openDelete", modalId: "deleteModal", cancelId: "cancelDelete" },
    { openBtn: "openExpenses", modalId: "expenseModal", cancelId: "cancelExpense" },
    { openBtn: "openIncome", modalId: "incomeModal", cancelId: "cancelIncome" }
  ];

function setupAllModals() {
    // 1. Universal Setup para sa pagbukas at pagsara
    modals.forEach(({ openBtn, modalId, cancelId }) => {
        const open = document.getElementById(openBtn);
        const modal = document.getElementById(modalId);
        const cancel = document.getElementById(cancelId);

        if (open && modal) {
            open.addEventListener("click", (e) => {
                e.preventDefault();
                document.querySelectorAll('.modal-overlay').forEach(m => m.hidden = true);
                modal.hidden = false;
            });
        }

        if (cancel && modal) {
            cancel.addEventListener("click", () => modal.hidden = true);
        }

        if (modal) {
            modal.addEventListener("click", e => {
                if (e.target === modal) modal.hidden = true;
            });
        }
    });

    attachSpecificActions();
}

function attachSpecificActions() {
    // Para sa LOGOUT
    const confirmLogout = document.getElementById("confirmLogout");
    if (confirmLogout) {
        confirmLogout.onclick = () => { 
            localStorage.clear();
            window.location.href = "Log-in.html";
        };
    }

    // Para sa DELETE
    const confirmDelete = document.getElementById("confirmDelete");
    if (confirmDelete) {
        confirmDelete.onclick = async () => {
            if (!user_id) return;
            confirmDelete.innerText = "Deleting...";
            try {
                const res = await fetch(`http://localhost:3000/delete-user/${user_id}`, { method: "DELETE" });
                if (res.ok) {
                    localStorage.clear();
                    window.location.href = "Log-in.html";
                }
            } catch (err) { console.error(err); }
        };
    }
}

function setupExpenseModal() {
  const saveExpense = document.getElementById("saveExpense");
  if (!saveExpense) return;

  saveExpense.addEventListener("click", async (e) => { 
    e.preventDefault();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const category = document.querySelector("#expenses-menu .drpdwn-option.active")?.textContent;

    if (!category || category === "Select") return alert("Please select a category");
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    const originalText = saveExpense.textContent;
    saveExpense.textContent = "Saving...";
    saveExpense.disabled = true;

    try {
      const res = await fetch(`http://localhost:3000/add-expense/${user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount })
      });
      
      const data = await res.json();

      saveExpense.textContent = originalText; 
      saveExpense.disabled = false;

      if (data.status === "success") {
        const currentMonth = new Date().getMonth() + 1;

        await filterByMonth(currentMonth); 
        
        document.getElementById("expenseModal").hidden = true;
        document.getElementById("expense-amount").value = "";
        document.querySelectorAll("#expenses-menu .drpdwn-option").forEach(opt => opt.classList.remove("active"));
        const dropdownLabel = document.querySelector("#expenses-dropdown .dropdown-label");
            if (dropdownLabel) dropdownLabel.textContent = "Select";

      } else {
        alert(data.message || "Failed to add expense");
        saveExpense.textContent = originalText;
        saveExpense.disabled = false;
      }
    } catch (err) {
      saveExpense.textContent = originalText;
      saveExpense.disabled = false;
      console.error("Expense Save Error:", err);
      alert("Something went wrong. Please try again.");
    }
  });
}

function setupIncomeModal() {
  const saveIncome = document.getElementById("saveIncome");
  if (!saveIncome) return;

  saveIncome.addEventListener("click", async (e) => { 
    e.preventDefault();
    const amount = parseFloat(document.getElementById("income-amount").value);
    const source = document.querySelector("#income-menu .drpdwn-option.active")?.textContent;

    if (!source || source === "Select") return alert("Please select income source");
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    const originalText = saveIncome.textContent;
    saveIncome.textContent = "Saving...";
    saveIncome.disabled = true;

    try {
      const res = await fetch(`http://localhost:3000/add-income/${user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, amount })
      });
      
      const data = await res.json();

      saveIncome.textContent = originalText;
      saveIncome.disabled = false;

      if (data.status === "success") {
        await updateDashboard(); 
        
        const currentMonth = new Date().getMonth() + 1;
        await filterByMonth(currentMonth);

        document.getElementById("incomeModal").hidden = true;
        document.getElementById("income-amount").value = "";
        document.querySelector("#income-dropdown .dropdown-label").textContent = "Select";
        
      } else {
        alert(data.message || "Failed to add income");
      }
    } catch (err) {
      saveIncome.textContent = originalText;
      saveIncome.disabled = false;
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  });
}

  // -------- DELETE -------------------
function setupDeleteAccount() {
    const confirmDeleteBtn = document.getElementById("confirmDelete");
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async (e) => { 
            e.preventDefault();

            const warning = window.confirm("Are you sure you want to delete your account? This will permanently remove all your data.");
            
            if (!warning) {
                console.log("Delete aborted by user.");
                return; 
            }

            if (!user_id) {
                alert("User ID not found. Please log in again.");
                return;
            }

            confirmDeleteBtn.innerText = "Deleting...";
            confirmDeleteBtn.disabled = true;

            try {
                const response = await fetch(`http://localhost:3000/delete-user/${user_id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Server Error Response:", errorText);
                    alert("Server error: " + response.status);
                    confirmDeleteBtn.innerText = "Delete Account";
                    confirmDeleteBtn.disabled = false;
                    return;
                }

                const result = await response.json();

                if (result.status === "success") {
                    alert("Account successfully deleted.");
                    localStorage.clear(); 
                    window.location.href = "Log-in.html"; 
                } else {
                    alert("Delete failed: " + result.message);
                    confirmDeleteBtn.innerText = "Delete Account";
                    confirmDeleteBtn.disabled = false;
                }
            } catch (error) {
                console.error("Fetch error:", error);
                alert("Cannot connect to server.");
                confirmDeleteBtn.innerText = "Delete Account";
                confirmDeleteBtn.disabled = false;
            }
        });
    }
}

    // -----------------------------
    // TATLO SA BABA NG RIGHT
    // -----------------------------
function calculateFinancialInsights(totals) {
    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    
    // 1. Total Expenses
    const totalExpenses = categories.reduce((sum, cat) => sum + (parseFloat(totals[cat]) || 0), 0);
    
    // 2. Avg Daily (Total / Days in current month)
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const avgDaily = totalExpenses / daysInMonth;
    
    // 3. Top Expense Category Name
    let topCatName = "None";
    let maxVal = 0;
    categories.forEach(cat => {
        const val = parseFloat(totals[cat]) || 0;
        if (val > maxVal) {
            maxVal = val;
            topCatName = cat;
        }
    });

    // 4. Savings Rate
    const totalIncome = (currentIncome.salary || 0) + (currentIncome.freelance || 0) + 
                        (currentIncome.business || 0) + (currentIncome.starting_money || 0);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    // 5. UPDATE UI
    const avgEl = document.getElementById("avg-daily-val");
    const rateEl = document.getElementById("savings-rate-val");
    const topEl = document.getElementById("top-expense-val");

    if (avgEl) avgEl.textContent = `₱ ${avgDaily.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    if (rateEl) rateEl.textContent = `${Math.max(0, savingsRate).toFixed(0)}%`;
    if (topEl) topEl.textContent = topCatName;
}

//////////////////////////////
// MONTHLY DROPDOWNNNNNNNNNNN
//////////////////////////////
function initMonthDropdown() {
    const menu = document.getElementById("header-menu");
    if (!menu) return;

    menu.querySelectorAll(".drpdwn-option").forEach(link => {
        link.onclick = async (e) => {
            e.preventDefault();
            
            let monthNumber = link.getAttribute("data-month");
            const monthName = link.textContent.trim();
            const label = document.querySelector('.dropdown-label');

            if (!monthNumber || monthName === "Present") {
                monthNumber = new Date().getMonth() + 1;
                if (label) label.textContent = "View Present";
            } else {
                if (label) label.textContent = monthName;
            }

            console.log(`DEBUG: Updating dashboard for month: ${monthNumber}`);

            await filterByMonth(monthNumber); 
            
            menu.hidden = true;
        };
    });
}

  // -----------------------------
  // UTILITIES
  // -----------------------------
  function setCurrentDate() {
    const el = document.getElementById("current-date");
    if (el) el.textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function whiteScreenTransition() {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:white; z-index:9999; transition:transform 1s ease;";
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.transform = "translateY(-100%)");
  }

async function updateMonthlyOverview(selectedMonth = null) {
    const user_id = localStorage.getItem("user_id");
    const month = selectedMonth || (new Date().getMonth() + 1);
    const year = new Date().getFullYear();

    try {
        const response = await fetch(`http://localhost:3000/api/monthly-stats/${user_id}?month=${month}&year=${year}`);
        const data = await response.json();

        const canvas = document.getElementById('mychart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (!data.labels || data.labels.length === 0) {
            console.warn("No data for Bar Chart. Showing empty state.");
            data.labels = ["No Data"];
            data.income = [0];
            data.expenses = [0];
        }

        if (window.myBarChart) {
            window.myBarChart.destroy();
        }

        window.myBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Income', data: data.income, backgroundColor: '#3b82f6', borderRadius: 5 },
                    { label: 'Expenses', data: data.expenses, backgroundColor: '#ef4444', borderRadius: 5 }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: { callback: (value) => '₱' + value.toLocaleString() }
                    } 
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    } catch (err) {
        console.error("Bar Chart Sync Error:", err);
    }
}

// --- ILAGAY ITO SA BABA NG MAIN.JS ---
function resetDashboardToZero() {
    // 1. Income Box Reset (Main Cards)
    const mainFields = ["monthly_income", "starting_money"]; //"current_balance"
    mainFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "₱ 0.00";
    });

    // 2. Transaction Breakdown Reset (Income Sources sa baba)
    // Sa HTML mo, may 'display-' prefix ang IDs dito
    const incomeSourceFields = ["display-salary", "display-freelance", "display-business"];
    incomeSourceFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "₱ 0.00";
    });

    // 3. Expense Categories Reset (Transaction List + Legend)
    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    categories.forEach(cat => {
        // Yung nasa listahan sa baba (id="Rent", etc.)
        const txnEl = document.getElementById(cat);
        if (txnEl) txnEl.textContent = "₱ 0.00";

        // Yung nasa tabi ng Pie Chart (id="leg-Rent", etc.)
        const legEl = document.getElementById(`leg-${cat}`);
        if (legEl) legEl.textContent = "₱ 0.00";
    });

    // 4. Stats Grid Reset
    const stats = ["avg-daily-val", "savings-rate-val", "top-expense-val"];
    stats.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes("rate")) el.textContent = "0%";
            else if (id.includes("top")) el.textContent = "None";
            else el.textContent = "₱ 0.00";
        }
    });

    // 5. Cash Flow & Total Expense Reset
    if (document.getElementById("total-expense-value")) 
        document.getElementById("total-expense-value").textContent = "₱ 0.00";
    
    // Reset Bars & Progress
    const bars = document.querySelectorAll('.progress-fill');
    bars.forEach(bar => bar.style.width = '0%');

    // 6. Reset Charts
    updateCashFlowStatus({});
    renderPieChart({});
}
