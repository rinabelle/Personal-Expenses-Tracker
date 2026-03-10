// ==============================
// MAIN.JS (Node.js Backend Ready)
// ==============================

// ------------------------------
// GLOBAL VARIABLES
// ------------------------------
const user_id = localStorage.getItem("user_id");
const display_name = localStorage.getItem("display_name");

// Income elements
const incomeEls = {
  salary: document.getElementById("salary"),
  freelance: document.getElementById("freelance"),
  net: document.getElementById("net_income"),
  monthly: document.getElementById("monthly_income")
};

// Current income state
let currentIncome = { salary: 0, freelance: 0, net: 0 };

// Pie chart instance
let pieChartInstance;

// ------------------------------
// DOCUMENT READY
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".dashboard")) return;

  whiteScreenTransition();
  fetchUserIncome();
  setCurrentDate();
  initMonthDropdown();
  loadExpenseTotals();
  initDropdowns();
  initCharts();
});

// ==============================
// WHITE SCREEN TRANSITION
// ==============================
function whiteScreenTransition() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "linear-gradient(to bottom, white 0%, white 90%, transparent 100%)";
  overlay.style.zIndex = "9999";
  overlay.style.pointerEvents = "none";
  overlay.style.transition = "transform 1s ease";
  overlay.style.transform = "translateY(0)";
  overlay.style.willChange = "transform";
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.transform = "translateY(-100%)";
  });

  overlay.addEventListener("transitionend", () => overlay.remove());
}

// ==============================
// FETCH USER & INCOME
// ==============================
function fetchUserIncome() {
  fetch(`http://localhost:3000/income/${userId}`, { credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success") throw new Error("Failed to fetch income");

      const usernameEl = document.getElementById("username");
      if (usernameEl) usernameEl.textContent = display_name || "";

      const salary = Number(data.salary || 0);
      const freelance = Number(data.freelance || 0);
      const netIncome = Number(data.net_income || 0);

      setIncome(salary, freelance, netIncome);
    })
    .catch(err => console.error(err));
}

// Fetch current user income (present month)
function fetchCurrentUserData() {
  fetch(`http://localhost:3000/income/${user_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success") throw new Error("Failed to fetch income");

      const income = data.data[0] || {};
      const salary = Number(income.salary || 0);
      const freelance = Number(income.freelance || 0);
      const netIncome = Number(income.net_income || 0);

      setIncome(salary, freelance, netIncome);
    })
    .catch(err => console.error(err));
}

// ==============================
// INCOME FUNCTIONS
// ==============================
function setIncome(salary, freelance, net) {
  currentIncome = { salary, freelance, net };
  incomeEls.salary.textContent = salary.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
  incomeEls.freelance.textContent = freelance.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
  incomeEls.net.textContent = net.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
  updateMonthlyTotal();
  updateCashFlowStatus();
}

function updateMonthlyTotal() {
  const total = currentIncome.salary + currentIncome.freelance + currentIncome.net;
  incomeEls.monthly.textContent = total.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

// ==============================
// EXPENSE FUNCTIONS
// ==============================
function loadExpenseTotals() {
  fetch(`http://localhost:3000/expenses/${user_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success") return;

      const totals = data.data;
      const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
      categories.forEach(cat => {
        const span = document.getElementById(cat);
        const amount = parseFloat(totals[cat]) || 0;
        if (span) span.textContent = amount.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      });

      renderPieChart(totals);
      updateCashFlowStatus();
    })
    .catch(err => console.error(err));
}

// ==============================
// CURRENT BALANCE
// ==============================
function refreshCurrentBalance() {
  fetch(`http://localhost:3000/balance/${user_id}`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== "success") return;
      const balanceEl = document.getElementById("current_balance");
      balanceEl.textContent = parseFloat(data.balance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      updateCashFlowStatus();
    });
}

// ==============================
// MONTH DROPDOWN
// ==============================
function initMonthDropdown() {
  const monthSelect = document.getElementById("viewMonth");
  if (!monthSelect) return;

  monthSelect.addEventListener("change", () => {
    const month = monthSelect.value;
    if (month === "present") {
      enableEditing();
      fetchCurrentUserData();
      return;
    }

    disableEditing();
    fetch(`/overview/month/${month}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.status !== "success") {
          alert(data.message || "Failed to load month data");
          return;
        }

        const { income, balance, expenseTotals } = data;

        setIncome(Number(income.salary), Number(income.freelance), Number(income.net_income));
        document.getElementById("current_balance").textContent = Number(balance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

        renderPieChart(expenseTotals);
        updateCashFlowStatus();
      });
  });
}

// ==============================
// DROPDOWN MENU
// ==============================
function initDropdowns() {
  const dropdowns = [
    { btn: "header-dropdown", menu: "header-menu" },
    { btn: "expenses-dropdown", menu: "expenses-menu" },
    { btn: "income-dropdown", menu: "income-menu" }
  ];

  dropdowns.forEach(d => {
    const btn = document.getElementById(d.btn);
    const menu = document.getElementById(d.menu);
    if (btn && menu) initDropdown(btn, menu);
  });
}

function initDropdown(btn, menu) {
  const label = btn.querySelector(".dropdown-label");

  btn.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = !menu.hidden;
    menu.hidden = isOpen;
    btn.setAttribute("aria-expanded", String(!isOpen));
    const chevron = btn.querySelector(".chevron");
    if (chevron) chevron.style.transform = isOpen ? "" : "rotate(180deg)";
  });

  menu.querySelectorAll(".drpdwn-option").forEach(opt => {
    opt.addEventListener("click", () => {
      menu.querySelectorAll(".drpdwn-option").forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      if (label) label.textContent = opt.textContent;
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      const chevron = btn.querySelector(".chevron");
      if (chevron) chevron.style.transform = "";
    });
  });

  // Cancel buttons
  const cancelExpenses = document.getElementById("cancelExpenses");
  const cancelIncome = document.getElementById("cancelIncome");
  if (cancelExpenses) {
    cancelExpenses.addEventListener("click", () => {
      document.getElementById("expenses-menu").hidden = true;
      document.getElementById("expenses-dropdown").setAttribute("aria-expanded", "false");
    });
  }
  if (cancelIncome) {
    cancelIncome.addEventListener("click", () => {
      document.getElementById("income-menu").hidden = true;
      document.getElementById("income-dropdown").setAttribute("aria-expanded", "false");
    });
  }
}

// ==============================
// CASH FLOW & PIE CHART
// ==============================
function updateCashFlowStatus() {
  const expenseBar = document.getElementById("expense-bar");
  const savingBar = document.getElementById("saving-bar");
  const monthlyEl = document.getElementById("monthly_income");
  const balanceEl = document.getElementById("current_balance");

  let monthlyIncome = parseFloat(monthlyEl.textContent.replace(/[^0-9.-]+/g, "")) || 0;
  let currentBalance = parseFloat(balanceEl.textContent.replace(/[^0-9.-]+/g, "")) || 0;

  if (expenseBar && savingBar) {
    if (monthlyIncome === 0) {
      expenseBar.style.width = "0%";
      savingBar.style.width = "0%";
      return;
    }
    // Update widths
    const expensePercent = Math.min((currentIncome.salary + currentIncome.freelance + currentIncome.net - currentBalance) / monthlyIncome * 100, 100);
    const savingPercent = Math.min(currentBalance / monthlyIncome * 100, 100);
    expenseBar.style.width = expensePercent + "%";
    savingBar.style.width = savingPercent + "%";
  }
}

// PIE CHART
function renderPieChart(expenseTotals) {
  const canvas = document.getElementById("pieChart");
  if (!canvas) return; // stop if canvas not found
  const ctx = canvas.getContext("2d");

  const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
  const colors = ["#98a2b4", "#cc3253", "#03a26a", "#b73a71", "#5546d0", "#9c52e1"];
  const data = categories.map(cat => parseFloat(expenseTotals[cat]) || 0);

  if (pieChartInstance) {
    pieChartInstance.data.datasets[0].data = data;
    pieChartInstance.update();
    return;
  }

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: { labels: categories, datasets: [{ data, backgroundColor: colors }] },
    options: { responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  });
}

// ==============================
// BAR CHART (Income)
// ==============================
function initCharts() {
  const ctx = document.getElementById("mychart")?.getContext("2d");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar"],
      datasets: [{
        label: "Income",
        data: [1000, 1200, 900],
        backgroundColor: "rgba(54, 162, 235, 0.5)"
      }]
    },
    options: { responsive: true }
  });
}

// ==============================
// UTILITY: Set Current Date
// ==============================
function setCurrentDate() {
  const today = new Date();
  const options = { year: "numeric", month: "short", day: "numeric" };
  const el = document.getElementById("current-date");
  if (el) el.textContent = today.toLocaleDateString("en-US", options);
}

// ==============================
// LOGOUT
// ==============================
function toLogin() {
  window.location.href = "/login";
}