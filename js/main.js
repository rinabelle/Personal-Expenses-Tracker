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
  // ------------------------------
  // DATA FETCHING FUNCTIONS
  // ------------------------------
async function loadExpenseTotals() {
    const uid = localStorage.getItem("user_id");
    if (!uid) return;

    try {
        const res = await fetch(`http://localhost:3000/expenses-data/${uid}`);
        
        if (!res.ok) {
            console.error("Server returned an error status:", res.status);
            return;
        }

        const data = await res.json();
        if (data.status === "success") {
            renderPieChart(data.data);
            updateDonutTotal(data.data);
            updateCashFlowStatus(data.data);
            calculateFinancialInsights(data.data);
        }
    } catch (err) {
        console.error("Fetch failed or JSON is invalid:", err);
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
      try {
          const response = await fetch(`http://localhost:3000/income/${user_id}`);
          const data = await response.json();
          
          if (data.status !== "success") return;
          
          const income = data.data[0] || {};
          const salary = Number(income.salary || 0);
          const freelance = Number(income.freelance || 0);
          const net = Number(income.net_income || 0);
          const start = Number(income.starting_money || 0);
          
          setIncome(salary, freelance, net, start);
      } catch (err) {
          console.error("Error income:", err);
      }
  }

  function setIncome(salary, freelance, net, starting = 0) {
    currentIncome = { salary, freelance, net, starting };
    const formatPHP = (val) => Number(val).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
    const updateEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatPHP(val); };

    if (incomeEls.starting) incomeEls.starting.textContent = formatPHP(starting);
    if (incomeEls.salary) incomeEls.salary.textContent = formatPHP(salary);
    if (incomeEls.freelance) incomeEls.freelance.textContent = formatPHP(freelance);
    if (incomeEls.net) incomeEls.net.textContent = formatPHP(net);

    updateEl("display-salary", salary);
    updateEl("display-freelance", freelance);
    updateEl("display-business", net);

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
    if (Object.keys(expenseTotals).length === 0) {
        console.warn("Skipping update: No expense data provided.");
        return;
    }

    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    
    categories.forEach(cat => {
        const amount = parseFloat(expenseTotals[cat] || 0);
        const formatted = amount.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        const el = document.getElementById(cat);
        const legElBottom = document.getElementById(`leg-${cat}`);
        if (el) el.textContent = formatted;
        if (legElBottom) legElBottom.textContent = formatted;
    });

    let finalTotal; 
    if (expenseTotals.totalFromDatabase !== undefined) {
        finalTotal = parseFloat(expenseTotals.totalFromDatabase);
    } else {
        finalTotal = categories.reduce((sum, cat) => sum + (parseFloat(expenseTotals[cat]) || 0), 0);
    }

    const totalEl = document.getElementById("total-expense-value");
    if (totalEl) {
        totalEl.textContent = finalTotal.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
    }

    const monthlyIncome = expenseTotals.incomeFromDatabase || 
                        (currentIncome.salary + currentIncome.freelance + currentIncome.net + (currentIncome.starting || 0));
    
    const savingsValue = monthlyIncome - finalTotal;

    const savingsEl = document.getElementById("savings-value");
    if (savingsEl) {
        savingsEl.textContent = savingsValue.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        savingsEl.style.color = savingsValue < 0 ? "#3b82f6" : ""; 
    }

    const expenseBar = document.querySelector(".progress-fill.progress-red");
    if (monthlyIncome > 0 && expenseBar) {
        const expPercent = Math.min((finalTotal / monthlyIncome) * 100, 100);
        expenseBar.style.width = `${expPercent}%`;
    }

    const savingsBar = document.querySelector(".progress-fill.progress-green");
    if (monthlyIncome > 0 && savingsBar) {
        const savingsPercent = Math.max(0, ((monthlyIncome - finalTotal) / monthlyIncome) * 100);
        savingsBar.style.width = `${savingsPercent}%`;
    }

    if (window.myBarChart) {
        const expenseDatasetIndex = 1;
        const dataset = window.myBarChart.data.datasets[expenseDatasetIndex].data;
        const lastIndex = dataset.length - 1;
        
        dataset[lastIndex] = finalTotal;
        window.myBarChart.update();
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

async function initCharts() {
    const ctx = document.getElementById("mychart")?.getContext("2d");
    if (!ctx) return;

    const userId = localStorage.getItem("user_id");
    const response = await fetch(`http://localhost:3000/api/monthly-stats/${userId}`);
    const dbData = await response.json(); 

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

    const labels = dbData.labels.map(label => {
        const monthNum = parseInt(label.replace("Month ", "")); 
        return monthNames[monthNum - 1];
    });

    const incomeData = dbData.income;
    const expenseData = dbData.expenses;

    if (myChartInstance) myChartInstance.destroy();

    myChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    backgroundColor: "rgba(54, 162, 235, 0.5)"
                },
                {
                    label: "Expenses",
                    data: expenseData,
                    backgroundColor: "rgba(255, 99, 132, 0.5)"
                }
            ]
        },
        options: { responsive: true }
    });
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

  function initMonthDropdown(selection) {
    const mapping = {
      "Present": "present",
      "Last Week": "week",
      "Last Month": "month",
      "Last 3 Months": "3months",
      "This Year": "year"
    };
    const period = mapping[selection];
    if (!period) return;

    if (period === "present") {
      fetchUserIncome();
      loadExpenseTotals();
    } else {
      fetch(`http://localhost:3000/overview/month/${period}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === "success") {
            const { income, balance, expenseTotals } = data.data;
            setIncome(Number(income.salary), Number(income.freelance), Number(income.net_income));
            const balanceEl = document.getElementById("current_balance");
            if (balanceEl) balanceEl.textContent = Number(balance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
            renderPieChart(expenseTotals);
            updateCashFlowStatus(expenseTotals);
          }
        })
        .catch(err => console.error("Error fetching historical data:", err));
    }
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
      const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
      
      const totalExpenses = categories.reduce((sum, cat) => sum + (parseFloat(totals[cat]) || 0), 0);
      
      const dayOfMonth = new Date().getDate();
      const avgDaily = totalExpenses / dayOfMonth;
      
      let topCat = "None";
      let maxVal = 0;
      categories.forEach(cat => {
          if (parseFloat(totals[cat]) > maxVal) {
              maxVal = parseFloat(totals[cat]);
              topCat = cat;
          }
      });

      const totalIncome = currentIncome.salary + currentIncome.freelance + currentIncome.net + currentIncome.starting;
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      document.getElementById("avg-daily-val").textContent = `₱ ${avgDaily.toFixed(2)}`;
      document.getElementById("savings-rate-val").textContent = `${Math.max(0, savingsRate).toFixed(0)}%`;
      document.getElementById("top-expense-val").textContent = `${topCat}`;
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

