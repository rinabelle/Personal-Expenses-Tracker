
// =======================
// chartt.js
// =======================

const userId = localStorage.getItem("user_id");

// ---------- FETCH DASHBOARD DATA ----------
async function fetchDashboard() {
  try {
    // Fetch latest income & balance
    const res = await fetch(`http://localhost:3000/dashboard/${userId}`);
    const data = await res.json();

    // Update income & balance cards
    document.getElementById("salary").textContent = `₱ ${data.salary || 0}`;
    document.getElementById("freelance").textContent = `₱ ${data.freelance || 0}`;
    document.getElementById("net_income").textContent = `₱ ${data.net_income || 0}`;
    document.getElementById("monthly_income").textContent = `₱ ${data.salary + data.freelance + data.net_income || 0}`;
    document.getElementById("current_balance").textContent = `₱ ${data.balance || 0}`;

  } catch (err) {
    console.error("Error fetching dashboard:", err);
  }
}

// ---------- FETCH EXPENSE DATA ----------
async function fetchExpenses() {
  try {
    const res = await fetch(`http://localhost:3000/expenses-data/${userId}`);
    const result = await res.json();

    if (result.status !== "success") return;

    const data = result.data; // Ito ay object gaya ng { Rent: 100, Food: 200, ... }
    const categories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
    
    // I-map ang values mula sa object
    const amounts = categories.map(cat => parseFloat(data[cat] || 0));

    // Update donut chart total
    const total = amounts.reduce((a, b) => a + b, 0);
    document.querySelector(".donut-lbl").textContent = `₱ ${total.toLocaleString()}`;

    // Update legend
    const legendEls = document.querySelectorAll(".legend .legend-amount");
    legendEls.forEach((el, i) => {
      el.textContent = `₱ ${amounts[i].toLocaleString() || 0}`;
    });

  } catch (err) {
    console.error("Error fetching expenses:", err);
  }
}

// ---------- INITIALIZE ----------
fetchDashboard();
fetchExpenses();
