// ==============================
// MAIN.JS (Node.js Backend Ready)
// ==============================

// Smooth transition (White Screen from the start)
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".dashboard")) {
    // White overlay animation
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background =
      "linear-gradient(to bottom, white 0%, white 90%, transparent 100%)";
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

    // DOM elements
    const usernameEl = document.getElementById("username");
    const salaryEl = document.getElementById("salary");
    const freelanceEl = document.getElementById("freelance");
    const netIncomeEl = document.getElementById("net_income");
    const monthlyEl = document.getElementById("monthly_income");
    const balanceEl = document.getElementById("current_balance");

    // ------------------------------
    // FETCH USER & INCOME DATA
    // ------------------------------
    fetch("/income", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "success") throw new Error("Failed to fetch income");

        // Update dashboard
        if (usernameEl) usernameEl.textContent = data.username || "";
        const salary = Number(data.salary || 0);
        const freelance = Number(data.freelance || 0);
        const netIncome = Number(data.net_income || 0);
        const totalMonthly = salary + freelance + netIncome;

        if (salaryEl) salaryEl.textContent = salary.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        if (freelanceEl) freelanceEl.textContent = freelance.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        if (netIncomeEl) netIncomeEl.textContent = netIncome.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
        if (monthlyEl) monthlyEl.textContent = totalMonthly.toLocaleString("en-PH", { style: "currency", currency: "PHP" });

        updateCashFlowStatus();
        loadMonthlyBarChart();
      })
      .catch((err) => console.error(err));

    // ------------------------------
    // Set current date
    // ------------------------------
    const today = new Date();
    const options = { year: "numeric", month: "short", day: "numeric" };
    document.getElementById("current-date").textContent = today.toLocaleDateString("en-US", options);

    // ------------------------------
    // Month dropdown
    // ------------------------------
    const monthSelect = document.getElementById("viewMonth");
    if (monthSelect) {
      monthSelect.addEventListener("change", () => {
        const month = monthSelect.value;
        if (month === "present") {
          enableEditing();
          fetchCurrentUserData();
          return;
        }

        disableEditing();
        fetch(`/overview/month/${month}`, { credentials: "include" })
          .then((res) => res.json())
          .then((data) => {
            if (data.status !== "success") {
              alert(data.message || "Failed to load month data");
              return;
            }

            const { income, balance, expenseTotals } = data;
            document.getElementById("salary").textContent = Number(income.salary).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
            document.getElementById("freelance").textContent = Number(income.freelance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
            document.getElementById("net_income").textContent = Number(income.net_income).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
            document.getElementById("monthly_income").textContent = (Number(income.salary) + Number(income.freelance) + Number(income.net_income)).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
            document.getElementById("current_balance").textContent = Number(balance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

            renderPieChart(expenseTotals);
            updateCashFlowStatus();
          });
      });
    }

    loadExpenseTotals();
  }
});

// ==============================
// LOGOUT BUTTON TRANSITION
// ==============================
function toLogin() {
  window.location.href = "/login"; // Node backend route
}

// ==============================
// MODAL FUNCTIONS
// ==============================
const modal = document.getElementById("popupModal");
const closeBtn = document.querySelector(".close");
const btnChange = document.querySelector(".btn-change");
const btnAdd = document.querySelector(".btn-add");
const btnList = document.querySelector(".btn-list");

btnChange.addEventListener("click", () => openModal("income"));
btnAdd.addEventListener("click", () => openModal("expenses"));
btnList.addEventListener("click", () => openModal("list"));

closeBtn.addEventListener("click", () => modal.classList.remove("show"));

// ------------------------------
// Fetch current user income (for present month)
// ------------------------------
function fetchCurrentUserData() {
  fetch("/income", { credentials: "include" })
    .then((res) => res.json())
    .then((incomeData) => {
      if (incomeData.status !== "success") return;

      const salary = Number(incomeData.salary || 0);
      const freelance = Number(incomeData.freelance || 0);
      const netIncome = Number(incomeData.net_income || 0);

      document.getElementById("salary").textContent = salary.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      document.getElementById("freelance").textContent = freelance.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      document.getElementById("net_income").textContent = netIncome.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      document.getElementById("monthly_income").textContent = (salary + freelance + netIncome).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

      refreshCurrentBalance();
      loadExpenseTotals();
      updateCashFlowStatus();
      loadMonthlyBarChart();
    });
}

// ------------------------------
// EXPENSE FUNCTIONS
// ------------------------------
function loadExpenseTotals() {
  fetch("/expenses/summary", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.status !== "success") return;

      const totals = data.data;
      const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
      categories.forEach((cat) => {
        const span = document.getElementById(cat);
        const amount = parseFloat(totals[cat]) || 0;
        if (span) span.textContent = amount.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      });

      renderPieChart(totals);
      updateCashFlowStatus();
    })
    .catch((err) => console.error(err));
}

function refreshCurrentBalance() {
  fetch("/balance", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.status !== "success") return;
      const balanceEl = document.getElementById("current_balance");
      balanceEl.textContent = parseFloat(data.balance).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
      updateCashFlowStatus();
    });
}

// ==============================
// DROPDOWN MENU
// ==============================
const btn = document.getElementById("dropdown-btn");
const menu = document.getElementById("dropdownMenu");
const label = document.getElementById("drpdwnLabel");

btn.addEventListener("click", () => {
  const isOpen = !menu.hidden;
  menu.hidden = isOpen;
  btn.setAttribute("aria-expanded", String(!isOpen));
  btn.querySelector(".chevron").style.transform = isOpen ? "" : "rotate(180deg)";
});

menu.querySelectorAll(".drpdwn-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    menu.querySelectorAll(".drpdwn-option").forEach((o) => o.classList.remove("active"));
    opt.classList.add("active");
    label.textContent = "View " + opt.textContent;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    btn.querySelector(".chevron").style.transform = "";
  });
});

document.addEventListener("click", (e) => {
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    btn.querySelector(".chevron").style.transform = "";
  }
});

// ==============================
// CASH FLOW & PIE CHART FUNCTIONS
// ==============================
function updateCashFlowStatus() {
  const expenseBar = document.getElementById("expense-bar");
  const savingBar = document.getElementById("saving-bar");
  const monthlyEl = document.getElementById("monthly_income");
  const balanceEl = document.getElementById("current_balance");

  let monthlyIncome = parseFloat(monthlyEl.textContent.replace(/[^0-9.-]+/g, "")) || 0;
  let currentBalance = parseFloat(balanceEl.textContent.replace(/[^0-9.-]+/g, "")) || 0;
  if (monthlyIncome === 0) {
    expenseBar.style.width = "0%";
    savingBar.style.width = "0%";
    return;
  }

  fetch("/expenses/summary", { credentials: "include" })
    .then((res) => res.json())
    .then((data) => {
      if (data.status !== "success") return;

      let totalExpenses = 0;
      for (const key in data.data) {
        totalExpenses += parseFloat(data.data[key]) || 0;
      }

      const expensePercent = (totalExpenses / monthlyIncome) * 100;
      const savingPercent = (currentBalance / monthlyIncome) * 100;

      expenseBar.style.width = Math.min(expensePercent, 100) + "%";
      savingBar.style.width = Math.min(savingPercent, 100) + "%";
    });
}

// PIE CHART
let pieChartInstance;
function renderPieChart(expenseTotals) {
  const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
  const colors = ["#3270e2", "#cc3253", "#03a26a", "#b73a71", "#5546d0", "#9c52e1"];
  const data = categories.map((cat) => parseFloat(expenseTotals[cat]) || 0);
  const total = data.reduce((a, b) => a + b, 0);

  categories.forEach((cat, i) => {
    const percentSpan = document.getElementById("percent-" + cat.toLowerCase());
    if (percentSpan) percentSpan.textContent = total ? ((data[i] / total) * 100).toFixed(1) + "%" : "0%";
  });

  if (pieChartInstance) {
    pieChartInstance.data.datasets[0].data = data;
    pieChartInstance.update();
    return;
  }

  const ctx = document.getElementById("pieChart").getContext("2d");
  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: { labels: categories, datasets: [{ data, backgroundColor: colors }] },
    options: { responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  });
}