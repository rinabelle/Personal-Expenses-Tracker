  // ------------------------------
  // GLOBAL VARIABLES
  // ------------------------------
  const user_id = localStorage.getItem("user_id");
  let pieChartInstance;
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
      try {
          await fetchUserIncome();
          loadExpenseTotals();
          loadMonthlyStats();
          fetchDashboardTotals();
          
      } catch (err) {
          console.error("Dashboard failed:", err);
      }
  }
  // ------------------------------
  // DATA FETCHING FUNCTIONS
  // ------------------------------
  function loadExpenseTotals() {
      console.log("Loading expenses..."); 
      
      fetch(`http://localhost:3000/expenses-data/${user_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status !== "success") return;
          renderPieChart(data.data);
          updateDonutTotal(data.data);
          updateCashFlowStatus(data.data);
          calculateFinancialInsights(data.data);
        })
        .catch(err => console.error(err));
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
    console.log("Updating UI with totals:", expenseTotals);
    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    
    categories.forEach(cat => {
        const amount = parseFloat(expenseTotals[cat] || 0);
        const formatted = amount.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        
        const el = document.getElementById(cat);
        const legElBottom = document.getElementById(`leg-${cat}`); 
        
        if (el) el.textContent = formatted;
        if (legElBottom) legElBottom.textContent = formatted;
    });

    const totalExpenses = categories.reduce((sum, cat) => sum + (parseFloat(expenseTotals[cat]) || 0), 0);
    const monthlyIncome = currentIncome.salary + currentIncome.freelance + currentIncome.net;
    const totalEl = document.getElementById("total-expense-value"); 
    
    if (totalEl) totalEl.textContent = totalExpenses.toLocaleString("en-PH", { style: "currency", currency: "PHP" });

    const expenseBar = document.querySelector(".progress-fill.progress-red");
    if (monthlyIncome > 0 && expenseBar) {
        const percent = Math.min((totalExpenses / monthlyIncome) * 100, 100);
        expenseBar.style.width = `${percent}%`;
    }
}

  async function loadMonthlyStats() {
    try {
        const response = await fetch(`http://localhost:3000/api/monthly-stats/${user_id}`);
        const data = await response.json();
        
        const ctx = document.getElementById('mychart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Income', data: data.income, backgroundColor: '#3b82f6' },
                    { label: 'Expenses', data: data.expenses, backgroundColor: '#ef4444' }
                ]
            },
            options: { responsive: true }
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

let myChartInstance = null;

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
    setupDeleteModal();
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

  function setupDeleteModal() {
    const confirmDelete = document.getElementById("confirmDelete");
    if (confirmDelete) {
      confirmDelete.addEventListener("click", () => {
        fetch(`http://localhost:3000/delete-user/${user_id}`, { method: "DELETE" })
          .then(res => res.json())
          .then(data => {
            if (data.status === "success") {
              localStorage.clear();
              window.location.href = "Log-in.html";
            } else {
              alert(data.message || "Failed to delete account");
            }
          })
          .catch(err => console.error(err));
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
        body: JSON.stringify({ category, amount })
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

