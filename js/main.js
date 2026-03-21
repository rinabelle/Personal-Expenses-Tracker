  // ------------------------------
  // GLOBAL VARIABLES
  // ------------------------------
  const user_id = localStorage.getItem("user_id");
  let pieChartInstance = null;
  let myChartInstance = null;
  let currentIncome = { salary: 0, freelance: 0, net: 0, starting: 0 };

  const incomeEls = {
    starting: document.getElementById("starting_money"),
    salary: document.getElementById("salary"),
    freelance: document.getElementById("freelance"),
    net: document.getElementById("net_income"),
    monthly: document.getElementById("monthly_income")
  };

document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector(".dashboard")) return;

    const username = localStorage.getItem("display_name"); 
    const userEl = document.getElementById("display-username");
    if (userEl && username) userEl.textContent = username;
      
    setCurrentDate(); 
    setupAllModals();
    setupDropdowns();

    await initializeDashboard(); 
});

async function initializeDashboard() {
    console.log("Initializing Dashboard...");
    try {
        await fetchUserIncome();
        await loadExpenseTotals();
        loadMonthlyStats();
        fetchDashboardTotals();
    } catch (err) {
        console.error("Dashboard failed:", err);
    }
}

const viewPresentBtn = document.getElementById("view-present-btn");
if (viewPresentBtn) {
    viewPresentBtn.addEventListener("click", () => {
        const labelElement = document.querySelector('.dropdown-label');
        if (labelElement) {
            labelElement.textContent = "View History"; // O "Present View"
            labelElement.style.color = ""; 
        }
        initializeDashboard(); 
    });
}

  // ------------------------------
  // DATA FETCHING FUNCTIONS
  // ------------------------------
async function loadExpenseTotals() {
    if (!user_id) return;
    try {
        const res = await fetch(`http://localhost:3000/expenses-data/${user_id}`);
        const data = await res.json();
        
        console.log("DEBUG: Expense Data Received:", data);

        renderPieChart(data);
        calculateFinancialInsights(data);
        updateCashFlowStatus(data); 
        
        if (typeof updateDonutTotal === "function") updateDonutTotal(data);

    } catch (err) {
        console.error("loadExpenseTotals failed:", err);
    }
}

function fetchDashboardTotals() {
    fetch(`http://localhost:3000/dashboard-totals/${user_id}`)
      .then(res => res.json())
      .then(data => {

          console.log("DEBUG: Dashboard Data:", data); 
          
          if (data.status === "success") {
              const balEl = document.getElementById("current_balance");
              if (balEl) {
                  const balance = Number(data.current_balance || 0);
                  balEl.textContent = balance.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
              }
          }
      })
      .catch(err => console.error("Error sa fetchDashboardTotals:", err));
}
  async function syncDashboard() {
      try {
          const res = await fetch(`http://localhost:3000/api/monthly-stats/${user_id}`);
          const data = await res.json();

          if (!data.expenses || data.expenses.length === 0) return;

          const currentTotalExpense = data.expenses[data.expenses.length - 1];
          const currentTotalIncome = data.income[data.income.length - 1];

          updateCashFlowStatus({
              totalFromDatabase: currentTotalExpense,
              incomeFromDatabase: currentTotalIncome 
          });

          const totalEl = document.getElementById("total-expense-value");
          if (totalEl) {
              totalEl.textContent = currentTotalExpense.toLocaleString("en-PH", { 
                  style: "currency", 
                  currency: "PHP" 
              });
          }

      } catch (err) {
          console.error("Sync Error:", err);
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

async function fetchUserIncome() {
    if (!user_id) return;
    try {
        const res = await fetch(`http://localhost:3000/income-summary/${user_id}`);
        const result = await res.json();
        
        if (result.status === "success") {
            // DAPAT TUMUGMA ITO SA PAGKAKASUNOD-SUNOD: salary, freelance, business, starting
            setIncome(
                parseFloat(result.salary) || 0,
                parseFloat(result.freelance) || 0,
                parseFloat(result.business) || 0, // <--- Siguraduhin na 'business' ang tawag sa DB/API mo
                parseFloat(result.starting) || 0  // <--- 'starting' o 'starting_money'
            );
        }
    } catch (err) {
        console.error("fetchUserIncome failed:", err);
    }
}

function setIncome(salary, freelance, net, starting = 0) {
    // I-save sa global variable para magamit sa ibang calculations
    currentIncome = { salary, freelance, net, starting };
    
    const formatPHP = (val) => Number(val).toLocaleString("en-PH", { 
        style: "currency", 
        currency: "PHP" 
    });

    // 1. Update Business (Gamit ang ID mo na net_income)
    if (incomeEls.net) incomeEls.net.textContent = formatPHP(net);

    // 2. Update Starting Money (Gamit ang ID mo na starting_money)
    if (incomeEls.starting) incomeEls.starting.textContent = formatPHP(starting);

    // 3. Update Salary at Freelance
    if (incomeEls.salary) incomeEls.salary.textContent = formatPHP(salary);
    if (incomeEls.freelance) incomeEls.freelance.textContent = formatPHP(freelance);

    // 4. Tawagin ang total calculation
    updateMonthlyTotal();
}

  function updateMonthlyTotal() {
    const total = currentIncome.starting + currentIncome.salary + currentIncome.freelance + currentIncome.net;
    if (incomeEls.monthly) incomeEls.monthly.textContent = total.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
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
    const monthlyIncome = (currentIncome.salary || 0) + (currentIncome.freelance || 0) + (currentIncome.net || 0) + (currentIncome.starting || 0);
    
    // 1. Calculate Total Expenses
    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    const finalTotal = categories.reduce((sum, cat) => sum + (parseFloat(expenseTotals[cat]) || 0), 0);

    // 2. Update Expense Text and Bar
    const expAmountEl = document.querySelector(".flow-amount.red");
    const expBar = document.querySelector(".progress-fill.progress-red");
    const expPctEl = document.querySelectorAll(".progress-pct")[0]; // Una sa listahan

    if (finalTotal > 0) {
        if (expAmountEl) expAmountEl.textContent = `₱${finalTotal.toLocaleString()}`;
        if (expBar) {
            const expPercent = Math.min((finalTotal / monthlyIncome) * 100, 100);
            expBar.style.width = `${expPercent}%`;
            expBar.style.display = "block";
        }
        if (expPctEl) expPctEl.textContent = `${((finalTotal / monthlyIncome) * 100).toFixed(0)}% of income`;
    } else {
        if (expAmountEl) expAmountEl.textContent = "₱";
        if (expBar) expBar.style.display = "none";
    }

    // 3. Update Savings Text and Bar
    const savingsAmount = monthlyIncome - finalTotal;
    const savingsAmountEl = document.querySelector(".flow-amount.green");
    const savingsBar = document.querySelector(".progress-fill.progress-green");
    const savingsPctEl = document.querySelectorAll(".progress-pct")[1]; // Pangalawa sa listahan

    if (savingsAmount > 0) {
        if (savingsAmountEl) savingsAmountEl.textContent = `₱${savingsAmount.toLocaleString()}`;
        if (savingsBar) {
            const savingsPercent = Math.max(0, (savingsAmount / monthlyIncome) * 100);
            savingsBar.style.width = `${savingsPercent}%`;
            savingsBar.style.display = "block";
        }
        if (savingsPctEl) savingsPctEl.textContent = `${((savingsAmount / monthlyIncome) * 100).toFixed(0)}% of income`;
    } else {
        if (savingsAmountEl) savingsAmountEl.textContent = "₱";
        if (savingsBar) savingsBar.style.display = "none";
    }
}

  async function loadMonthlyStats() {
      try {
          const response = await fetch(`http://localhost:3000/api/monthly-stats/${user_id}`);
          const data = await response.json();

          const canvas = document.getElementById('mychart');
          if (!canvas) return;
          const ctx = canvas.getContext('2d');

          if (window.myBarChart) {
              window.myBarChart.destroy();
          }

          window.myBarChart = new Chart(ctx, {
              type: 'bar',
              data: {
                  labels: data.labels,
                  datasets: [
                      { 
                          label: 'Income', 
                          data: data.income, 
                          backgroundColor: '#3b82f6',
                          borderRadius: 5
                      },
                      { 
                          label: 'Expenses', 
                          data: data.expenses, 
                          backgroundColor: '#ef4444',
                          borderRadius: 5
                      }
                  ]
              },
              options: { 
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                      y: { 
                          beginAtZero: true,
                          ticks: {
                              callback: (value) => '₱' + value.toLocaleString()
                          }
                      }
                  }
              }
          });
      } catch (err) {
          console.error("Error loading monthly stats:", err);
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

    if (window.myBarChart) {
        window.myBarChart.destroy();
        window.myBarChart = null; 
    }

    const userId = localStorage.getItem("user_id");
    const currentYear = year || new Date().getFullYear();
    
    let url = `http://localhost:3000/api/monthly-stats/${userId}?year=${currentYear}`;
    if (month) {
        url += `&month=${month}`; 
    }

    try {
        const response = await fetch(url);
        const dbData = await response.json(); 

        if (!dbData.labels || dbData.labels.length === 0) {
            console.warn("Walang data para sa chart sa period na ito.");
            return;
        }

        let labels = dbData.labels;
        if (!month) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
            labels = dbData.labels.map(label => {
                const monthNum = parseInt(label.replace("Month ", "")); 
                return monthNames[monthNum - 1] || label;
            });
        }

        window.myBarChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    { label: "Income", data: dbData.income, backgroundColor: "#3b82f6" },
                    { label: "Expenses", data: dbData.expenses, backgroundColor: "#ef4444" }
                ]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (err) {
        console.error("Chart Error:", err);
    }
}

  // -----------------------------
  // DROPDOWNS & MONTH SELECT
  // -----------------------------
  function setupDropdowns() {
    setupDropdown("expenses-dropdown", "expenses-menu", "cancelExpense", (selection) => {});
    setupDropdown("income-dropdown", "income-menu", "cancelIncome", (selection) => {});
    setupDropdown("header-dropdown", "header-menu", null, initMonthDropdown);
  }

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
        if (label) label.textContent = opt.textContent.trim();
        if (onSelect) onSelect(opt.textContent.trim());
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        if (chevron) chevron.style.transform = "";
      });
    });

    if (cancelBtnId) {
      document.getElementById(cancelBtnId)?.addEventListener("click", () => {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        if (chevron) chevron.style.transform = "";
      });
    }
  }

async function filterByMonth(monthNumber) {
    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[parseInt(monthNumber)];
    const currentYear = new Date().getFullYear();

    const label = document.querySelector('.dropdown-label');
    if (label) label.textContent = monthName;

    try {
        const res = await fetch(`http://localhost:3000/overview/filter/${monthNumber}?user_id=${user_id}&year=${currentYear}`);
        const result = await res.json();

        if (result.status === "success") {
            const inc = result.income_details || {};
            const exp = result.data || {}; 

            const chartHeader = document.querySelector('.monthly-overview h3');
            if (chartHeader) {
                // Kung may monthNumber, halimbawa "January Overview", kung wala "Yearly Overview"
                chartHeader.textContent = monthNumber ? `${monthName} Overview` : "Yearly Overview";
            }

            // Helper function para sa uniform formatting
            const formatPHP = (val) => `₱${(parseFloat(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

            // 1. UPDATE INCOME BOXES (Main Cards)
            const totalInc = (parseFloat(inc.salary) || 0) + (parseFloat(inc.freelance) || 0) + (parseFloat(inc.net_income) || 0) + (parseFloat(inc.starting_money) || 0);
            
            // Update Global Variable for calculations
            currentIncome = { 
                salary: parseFloat(inc.salary) || 0, 
                freelance: parseFloat(inc.freelance) || 0, 
                net: parseFloat(inc.net_income) || 0, 
                starting: parseFloat(inc.starting_money) || 0 
            };

            if (incomeEls.monthly) incomeEls.monthly.textContent = formatPHP(totalInc);
            if (incomeEls.starting) incomeEls.starting.textContent = formatPHP(inc.starting_money);
            if (incomeEls.salary) incomeEls.salary.textContent = formatPHP(inc.salary);
            if (incomeEls.freelance) incomeEls.freelance.textContent = formatPHP(inc.freelance);
            if (incomeEls.net) incomeEls.net.textContent = formatPHP(inc.net_income);

            // 2. UPDATE SIDEBAR BREAKDOWN (Yung tinutukoy mong ₱200/₱100 labels)
            const sideSalary = document.getElementById("salary");
            const sideFreelance = document.getElementById("freelance");
            const sideBusiness = document.getElementById("net_income");

            if (sideSalary) sideSalary.textContent = formatPHP(inc.salary);
            if (sideFreelance) sideFreelance.textContent = formatPHP(inc.freelance);
            if (sideBusiness) sideBusiness.textContent = formatPHP(inc.net_income);

            // 3. UPDATE BALANCE
            const balanceEl = document.getElementById("current_balance");
            if (balanceEl) balanceEl.textContent = formatPHP(result.balance);

            // 4. CALCULATE TOTALS FOR UI
            const totalExpenses = Object.values(exp).reduce((a, b) => a + (parseFloat(b) || 0), 0);
            const savingsAmount = totalInc - totalExpenses;
            const savingsRate = totalInc > 0 ? (savingsAmount / totalInc) * 100 : 0;

            // 5. PROGRESS BARS
            const expAmtEl = document.getElementById("total-expense-value");
            const expBar = document.querySelector(".progress-fill.progress-red");
            const savingsAmtEl = document.getElementById("savings-value");
            const savingsBar = document.querySelector(".progress-fill.progress-green");

            if (expAmtEl) expAmtEl.textContent = formatPHP(totalExpenses);
            if (expBar) expBar.style.width = `${Math.min((totalExpenses / (totalInc || 1)) * 100, 100)}%`;
            
            if (savingsAmtEl) savingsAmtEl.textContent = formatPHP(savingsAmount);
            if (savingsBar) savingsBar.style.width = `${Math.max(0, savingsRate)}%`;

            // 6. REFRESH CHARTS & INSIGHTS
            initCharts(monthNumber, currentYear);
            updateCashFlowStatus(exp);
            renderPieChart(exp);
            calculateFinancialInsights(exp);

        } else {
            resetDashboardToZero(); 
        }
    } catch (err) {
        console.error("Error switching months:", err);
        resetDashboardToZero();
    }
}

// --- ILAGAY ITO SA BABA NG MAIN.JS ---
function resetDashboardToZero() {
    // Income Box Reset (Main Cards)
    const mainFields = ["monthly_income", "starting_money", "salary", "freelance", "net_income"];
    mainFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "₱0.00";
    });

    // Sidebar Breakdown Reset (Yung labels sa gilid)
    const sideFields = ["salary", "freelance", "net_income"];
    sideFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "₱0.00";
    });

    // Stats Grid Reset
    const stats = ["avg-daily-val", "savings-rate-val", "top-expense-val"];
    stats.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = id.includes("rate") ? "0%" : (id.includes("top") ? "None" : "₱0.00");
    });

    // Cash Flow Text Reset
    if (document.getElementById("total-expense-value")) document.getElementById("total-expense-value").textContent = "₱0.00";
    if (document.getElementById("savings-value")) document.getElementById("savings-value").textContent = "₱0.00";

    // Reset Charts & Bars
    updateCashFlowStatus({});
    renderPieChart({});
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
    modals.forEach(({ openBtn, modalId, cancelId }) => {
      const open = document.getElementById(openBtn);
      const modal = document.getElementById(modalId);
      const cancel = document.getElementById(cancelId);
      if (open && modal) open.addEventListener("click", () => modal.hidden = false);
      if (cancel && modal) cancel.addEventListener("click", () => modal.hidden = true);
      if (modal) {
        modal.addEventListener("click", e => {
          if (e.target === modal) modal.hidden = true;
        });
      }
    });

    setupLogoutModal();
    setupDeleteAccount();
    setupExpenseModal();
    setupIncomeModal();
  }

  function setupLogoutModal() {
    const confirmLogout = document.getElementById("confirmLogout");
    if (confirmLogout) {
      confirmLogout.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "Log-in.html";
      });
    }
  }

 
  function setupExpenseModal() {
    const saveExpense = document.getElementById("saveExpense");
    if (!saveExpense) return;

    saveExpense.addEventListener("click", e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("expense-amount").value);
      const category = document.querySelector("#expenses-menu .drpdwn-option.active")?.textContent;

      if (!category || category === "Select") return alert("Please select a category");
      if (!amount || amount <= 0) return alert("Enter a valid amount");

      const originalText = saveExpense.textContent;
      saveExpense.textContent = "Saving...";
      saveExpense.disabled = true;

      fetch(`http://localhost:3000/add-expense/${user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, user_id: user_id})
      })
      .then(res => res.json())
      .then(data => {
        saveExpense.textContent = originalText;
        saveExpense.disabled = false;

        if (data.status === "success") {
          loadExpenseTotals();  
          refreshCurrentBalance();
          document.getElementById("expenseModal").hidden = true;
          document.getElementById("expense-amount").value = "";
          document.querySelector("#expenses-dropdown .dropdown-label").textContent = "Select";
        } else {
          alert(data.message || "Failed to add expense");
        }
      })
      .catch(err => {
        saveExpense.textContent = originalText;
        saveExpense.disabled = false;
        console.error(err);
        alert("Something went wrong. Please try again.");
      });
    });
  }

  function setupIncomeModal() {
    const saveIncome = document.getElementById("saveIncome");
    if (!saveIncome) return;

    saveIncome.addEventListener("click", e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById("income-amount").value);
      const source = document.querySelector("#income-menu .drpdwn-option.active")?.textContent;

      if (!source || source === "Select") return alert("Please select income source");
      if (!amount || amount <= 0) return alert("Enter a valid amount");

      const originalText = saveIncome.textContent;
      saveIncome.textContent = "Saving...";
      saveIncome.disabled = true;

      fetch(`http://localhost:3000/add-income/${user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, amount })
      })
      .then(res => res.json())
      .then(data => {
        saveIncome.textContent = originalText;
        saveIncome.disabled = false;

        if (data.status === "success") {
          fetchUserIncome();
          document.getElementById("incomeModal").hidden = true;
          document.getElementById("income-amount").value = "";
          document.querySelector("#income-dropdown .dropdown-label").textContent = "Select";
        } else {
          alert(data.message || "Failed to add income");
        }
      })
      .catch(err => {
        saveIncome.textContent = originalText;
        saveIncome.disabled = false;
        console.error(err);
        alert("Something went wrong. Please try again.");
      });
    });
  }

  // -------- DELETE -------------------
function setupDeleteAccount() {
    const confirmDeleteBtn = document.getElementById("confirmDelete");
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", async (e) => { 
            e.preventDefault();

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
                    alert("Server error: " + response.status + ". Pakicheck ang backend route.");
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
                alert("Cannot connect to server. Is it running?");
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
    console.log("DEBUG: Calculating insights with data:", totals);

    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    
    // 1. Total Expenses
    const totalExpenses = categories.reduce((sum, cat) => sum + (parseFloat(totals[cat]) || 0), 0);
    
    // 2. Avg Daily
    const dayOfMonth = new Date().getDate(); 
    const avgDaily = totalExpenses / dayOfMonth;
    
    // 3. Top Expense
    let topCat = "None";
    let maxVal = 0;
    categories.forEach(cat => {
        const val = parseFloat(totals[cat]) || 0;
        if (val > maxVal) {
            maxVal = val;
            topCat = cat;
        }
    });

    // 4. Savings Rate (Gamit ang currentIncome global variable)
    const totalIncome = (currentIncome.salary || 0) + (currentIncome.freelance || 0) + (currentIncome.net || 0) + (currentIncome.starting || 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // 5. UPDATE UI - Dito tayo mag-ingat sa IDs
    const avgEl = document.getElementById("avg-daily-val");
    const rateEl = document.getElementById("savings-rate-val");
    const topEl = document.getElementById("top-expense-val");

    if (avgEl) {
        avgEl.textContent = `₱ ${avgDaily.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    } else {
        console.warn("MISSING HTML ID: avg-daily-val");
    }

    if (rateEl) {
        rateEl.textContent = `${Math.max(0, savingsRate).toFixed(0)}%`;
    } else {
        console.warn("MISSING HTML ID: savings-rate-val");
    }

    if (topEl) {
        topEl.textContent = topCat;
    } else {
        console.warn("MISSING HTML ID: top-expense-val");
    }
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
            
            const monthNumber = link.getAttribute("data-month");
            const monthName = link.textContent.trim();

            if (monthNumber) {
                console.log(`Filtering for: ${monthName}`);
                await filterByMonth(monthNumber); 
            } else {
                const label = document.querySelector('.dropdown-label');
                if (label) label.textContent = "View History";
                initializeDashboard(); 
            }
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

