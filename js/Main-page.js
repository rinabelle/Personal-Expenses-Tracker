// Smooth transition (White Screen from the start)
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".dashboard")) {
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

    // Fetch user data
    fetch("php/current_user.php")
      .then((res) => res.json())
      .then((data) => {
        if (balanceEl && data.balance !== undefined) {
          balanceEl.textContent = Number(data.balance).toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP",
          });

          updateCashFlowStatus();
        }

        const userId = data.id;

        if (data.first_time) openFirstTimeModal(userId);

        // Fetch income data
        return fetch("php/get_income.php")
          .then((res) => res.json())
          .then((incomeData) => {
            if (usernameEl) usernameEl.textContent = data.username || "";

            if (incomeData.status === "success") {
              const salary = Number(incomeData.salary || 0);
              const freelance = Number(incomeData.freelance || 0);
              const netIncome = Number(incomeData.net_income || 0);
              const totalMonthly = salary + freelance + netIncome;

              if (salaryEl)
                salaryEl.textContent = salary.toLocaleString("en-PH", {
                  style: "currency",
                  currency: "PHP",
                });
              if (freelanceEl)
                freelanceEl.textContent = freelance.toLocaleString("en-PH", {
                  style: "currency",
                  currency: "PHP",
                });
              if (netIncomeEl)
                netIncomeEl.textContent = netIncome.toLocaleString("en-PH", {
                  style: "currency",
                  currency: "PHP",
                });
              if (monthlyEl)
                monthlyEl.textContent = totalMonthly.toLocaleString("en-PH", {
                  style: "currency",
                  currency: "PHP",
                });

              loadMonthlyBarChart();
              updateCashFlowStatus();
            }

            return data.id;
          });
      })
      .catch((err) => {
        console.error(err);
        alert("Error fetching user or income data.");
      });

    // Set current date dynamically
    const today = new Date();
    const options = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = today.toLocaleDateString("en-US", options);
    document.getElementById("current-date").textContent = formattedDate;

    // Viewing Month
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

        fetch(`php/get_month_data.php?month=${month}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.status !== "success") {
              alert(data.message || "Failed to load month data");
              return;
            }

            const { income, balance, expenseTotals } = data;

            document.getElementById("salary").textContent = Number(
              income.salary,
            ).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

            document.getElementById("freelance").textContent = Number(
              income.freelance,
            ).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

            document.getElementById("net_income").textContent = Number(
              income.net_income,
            ).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

            document.getElementById("monthly_income").textContent = (
              Number(income.salary) +
              Number(income.freelance) +
              Number(income.net_income)
            ).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

            document.getElementById("current_balance").textContent = Number(
              balance,
            ).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

            renderPieChart(expenseTotals);
            updateCashFlowStatus();
          });
      });
    }

    loadExpenseTotals();
  }
});

// Transition in Logout Button
function toLogin() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    window.location.href = "Log-in.html";
  }, 1200);
}

const modal = document.getElementById("popupModal");
const closeBtn = document.querySelector(".close");
const btnChange = document.querySelector(".btn-change");
const btnAdd = document.querySelector(".btn-add");
const btnList = document.querySelector(".btn-list");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalInputs = document.getElementById("modalInputs");
const submitButton = document.getElementById("submitBtn");

function openModal(type) {
  modalInputs.innerHTML = "";

  if (type === "income") {
    modalTitle.textContent = "Change Income";
    modalTitle.style.color = "#22c55e";
    modalText.textContent = "Enter your income details:";

    const fields = [
      { key: "salary", label: "Salary", color: "#2d8668" },
      { key: "freelance", label: "Freelance", color: "#2fa982" },
      { key: "net_income", label: "Net Income (Business)", color: "#5ea891" },
    ];

    const inputElements = {};

    // Fetch last saved income if exists
    fetch("php/get_income.php")
      .then((res) => res.json())
      .then((incomeData) => {
        // Declare savedIncomeData safely
        const savedIncomeData =
          incomeData.status === "success"
            ? {
                salary: incomeData.salary,
                freelance: incomeData.freelance,
                net_income: incomeData.net_income,
              }
            : null;

        fields.forEach((f) => {
          const label = document.createElement("label");
          label.textContent = f.label;
          label.style.color = f.color;

          const input = document.createElement("input");
          input.type = "number";
          input.placeholder = f.placeholder;

          if (savedIncomeData) {
            input.value = savedIncomeData[f.key] || "";
          }

          modalInputs.appendChild(label);
          modalInputs.appendChild(input);

          inputElements[f.key] = input;
        });

        // Save button
        const submitButton = document.getElementById("submitBtn");
        submitButton.textContent = "Save";
        submitButton.style.display = "inline-block";

        // Remove old listeners by cloning
        const newSubmit = submitButton.cloneNode(true);
        submitButton.replaceWith(newSubmit);

        newSubmit.addEventListener("click", (e) => {
          e.preventDefault();

          // Validate
          let allFilled = true;
          fields.forEach((f) => {
            if (!inputElements[f.key].value) allFilled = false;
          });
          if (!allFilled) {
            alert("Please fill in all fields!");
            return;
          }

          // Get values
          const salary = parseFloat(inputElements.salary.value);
          const freelance = parseFloat(inputElements.freelance.value);
          const netIncome = parseFloat(inputElements.net_income.value);
          const monthlyIncome = salary + freelance + netIncome;

          // Save to backend
          fetch("php/save_income.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              salary,
              freelance,
              net_income: netIncome,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.status === "success") {
                // Update dashboard immediately
                document.getElementById("salary").textContent =
                  salary.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  });
                document.getElementById("freelance").textContent =
                  freelance.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  });
                document.getElementById("net_income").textContent =
                  netIncome.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  });
                document.getElementById("monthly_income").textContent =
                  monthlyIncome.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  });

                modal.classList.remove("show");
                updateCashFlowStatus();
                loadMonthlyBarChart();
              } else {
                alert("Error saving income data: " + data.message);
              }
            })
            .catch((err) => {
              console.error(err);
              alert("Error saving income data");
            });
        });
      })
      .catch((err) => {
        console.error(err);
        alert("Error fetching income data.");
      });
  } else if (type === "expenses") {
    modalTitle.textContent = "Add Expenses";
    modalTitle.style.color = "#ef4444";
    modalText.textContent = "Enter your expense details:";

    // First input: Amount
    const amountLabel = document.createElement("label");
    amountLabel.textContent = "Amount";
    amountLabel.style.color = "#2563eb";

    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.placeholder = "Enter amount...";

    modalInputs.appendChild(amountLabel);
    modalInputs.appendChild(amountInput);

    // Second input: Category dropdown
    const categoryLabel = document.createElement("label");
    categoryLabel.textContent = "Category";
    categoryLabel.style.color = "#16a34a";

    const categorySelect = document.createElement("select");

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select Category --";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    categorySelect.appendChild(placeholderOption);

    const categories = [
      "Rent",
      "Food",
      "Transport",
      "Shopping",
      "Bills",
      "Entertainment",
    ];

    categories.forEach((c) => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      categorySelect.appendChild(option);
    });

    modalInputs.appendChild(categoryLabel);
    modalInputs.appendChild(categorySelect);

    // Third input: Description
    const descriptionLabel = document.createElement("label");
    descriptionLabel.textContent = "Description (Optional)";
    descriptionLabel.style.color = "#9333ea";

    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.placeholder = "Enter description...";

    modalInputs.appendChild(descriptionLabel);
    modalInputs.appendChild(descriptionInput);

    // SETUP SUBMIT BUTTON
    const submitButton = document.getElementById("submitBtn");
    submitButton.textContent = "Save";
    submitButton.style.display = "inline-block";

    const newSubmit = submitButton.cloneNode(true);
    submitButton.replaceWith(newSubmit);

    newSubmit.addEventListener("click", (e) => {
      e.preventDefault();

      const amount = parseFloat(amountInput.value);
      const category = categorySelect.value;
      const description = descriptionInput.value;

      // Generate Current Date
      const expense_date = new Date().toISOString().split("T")[0];

      if (!amount || !category) {
        alert("Please fill in all required fields!");
        return;
      }

      // Get current balance from span
      const totalBalance =
        parseFloat(
          document
            .getElementById("current_balance")
            .textContent.replace(/[^0-9.-]+/g, ""),
        ) || 0;

      if (amount > totalBalance) {
        alert("Expense exceeds your current balance!");
        return;
      }

      // Send to Backend
      fetch("php/save_expense.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          category,
          description,
          expense_date,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            modal.classList.remove("show");

            loadExpenseTotals();
            refreshCurrentBalance();
            loadMonthlyBarChart();
          } else {
            alert("Error saving expense: " + data.message);
          }
        })
        .catch((err) => {
          console.error(err);
          alert("Error saving expense.");
        });
    });
  } else if (type === "list") {
    modalTitle.textContent = "Expense List";
    modalTitle.style.color = "#ef4444";
    modalText.textContent =
      "Click rows to select multiple expenses for removal.";

    modalInputs.innerHTML = "";

    const selectedRows = new Set();

    // Build table after fetching expenses
    fetch("php/get_expenses.php", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (
          data.status !== "success" ||
          !Array.isArray(data.expenses) ||
          data.expenses.length === 0
        ) {
          modalInputs.textContent = "No expenses found.";
          document.getElementById("current_balance").textContent = Number(
            data.current_balance || 0,
          ).toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP",
          });
          return;
        }

        // Update current balance from backend first
        document.getElementById("current_balance").textContent = Number(
          data.current_balance,
        ).toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        });

        // Create table
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";

        // Table header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Date", "Category", "Amount", "Description"].forEach((col) => {
          const th = document.createElement("th");
          th.textContent = col;
          th.style.borderBottom = "1px solid #ccc";
          th.style.padding = "8px";
          th.style.textAlign = "left";
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement("tbody");

        data.expenses.forEach((exp) => {
          const row = document.createElement("tr");
          row.dataset.id = exp.id;
          row.dataset.amount = exp.amount; // store amount for balance restore

          row.innerHTML = `
          <td>${exp.expense_date}</td>
          <td>${exp.category}</td>
          <td>${Number(exp.amount).toLocaleString("en-PH", { style: "currency", currency: "PHP" })}</td>
          <td>${exp.description || "-"}</td>
        `;

          // Multi-select toggle
          row.addEventListener("click", () => {
            if (selectedRows.has(row)) {
              row.classList.remove("selected");
              selectedRows.delete(row);
            } else {
              row.classList.add("selected");
              selectedRows.add(row);
            }
          });

          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        modalInputs.appendChild(table);

        // Setup Remove button
        const submitButton = document.getElementById("submitBtn");
        submitButton.textContent = "Remove";
        submitButton.classList.add("remove-btn");

        // Remove click listener to prevent duplicates
        submitButton.replaceWith(submitButton.cloneNode(true));
        const newSubmit = document.getElementById("submitBtn");

        newSubmit.onclick = () => {
          if (selectedRows.size === 0) {
            alert("Please select at least one row!");
            return;
          }

          const idsToDelete = Array.from(selectedRows).map(
            (row) => row.dataset.id,
          );
          const amountsToRestore = Array.from(selectedRows).map((row) =>
            parseFloat(row.dataset.amount),
          );

          fetch("php/delete_expense.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: idsToDelete }),
          })
            .then((res) => res.json())
            .then((result) => {
              if (result.status === "success") {
                // Remove rows visually
                selectedRows.forEach((row) => row.remove());
                selectedRows.clear();

                // Restore amounts to current balance
                const balanceEl = document.getElementById("current_balance");
                let currentBalance =
                  parseFloat(balanceEl.textContent.replace(/[^0-9.-]+/g, "")) ||
                  0;
                const restoredTotal = amountsToRestore.reduce(
                  (acc, amt) => acc + amt,
                  0,
                );
                currentBalance += restoredTotal;
                balanceEl.textContent = currentBalance.toLocaleString("en-PH", {
                  style: "currency",
                  currency: "PHP",
                });

                loadExpenseTotals();
                updateCashFlowStatus();
                loadMonthlyBarChart();
              } else {
                alert("Error deleting expenses: " + result.message);
              }
            })
            .catch((err) => {
              console.error(err);
              alert("Error deleting expenses.");
            });
        };
      })
      .catch((err) => {
        console.error(err);
        modalInputs.textContent = "Error loading expenses.";
      });
  }

  modal.classList.add("show");
}

function loadExpenseTotals() {
  fetch("php/get_expense_totals.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        const totals = data.data;

        const categories = [
          "Rent",
          "Food",
          "Transport",
          "Shopping",
          "Bills",
          "Entertainment",
        ];

        categories.forEach((category) => {
          const span = document.getElementById(category);

          const amount = parseFloat(totals[category]) || 0;

          span.textContent = amount.toLocaleString("en-PH", {
            style: "currency",
            currency: "PHP",
          });
        });

        renderPieChart(totals);
        updateCashFlowStatus();
      }
    })
    .catch((err) => {
      console.error("Error loading expenses:", err);
    });
}

function refreshCurrentBalance() {
  fetch("php/get_current_balance.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        document.getElementById("current_balance").textContent = parseFloat(
          data.balance,
        ).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

        updateCashFlowStatus();
      }
    });
}

// Open modal on button click
btnChange.addEventListener("click", () => openModal("income"));
btnAdd.addEventListener("click", () => openModal("expenses"));
btnList.addEventListener("click", () => openModal("list"));

// Close modal on 'x' click or outside click
closeBtn.addEventListener("click", () => {
  modal.classList.remove("show");
  submitButton.classList.remove("remove-btn");
});

/*
  ========================================
  

  MODAL POP UP (For new users)


  ========================================
*/
function openFirstTimeModal(userId) {
  modalInputs.innerHTML = "";

  modalTitle.textContent = "Welcome! Set Up Your Income";
  modalTitle.style.color = "#22c55e";
  modalText.textContent = "Enter your income and starting balance:";

  // Fields
  const fields = [
    {
      key: "salary",
      label: "Salary",
      placeholder: "Enter salary...",
      color: "#2d8668",
    },
    {
      key: "freelance",
      label: "Freelance",
      placeholder: "Enter freelance income...",
      color: "#2fa982",
    },
    {
      key: "net_income",
      label: "Net Income (Business)",
      placeholder: "Enter net income...",
      color: "#5ea891",
    },
  ];

  const inputElements = {};

  fields.forEach((f) => {
    const label = document.createElement("label");
    label.textContent = f.label;
    label.style.color = f.color;

    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = f.placeholder;
    input.required = true;

    modalInputs.appendChild(label);
    modalInputs.appendChild(input);

    inputElements[f.key] = input; // store reference for later
  });

  // Hide close button
  closeBtn.style.display = "none";

  // Save button
  const submitButton = document.getElementById("submitBtn");
  if (submitButton) {
    submitButton.textContent = "Save";
    submitButton.style.display = "inline-block";

    // Remove any old click handlers to avoid duplicates
    submitButton.replaceWith(submitButton.cloneNode(true)); // removes old listeners
    const newSubmit = document.getElementById("submitBtn");

    newSubmit.addEventListener("click", (e) => {
      e.preventDefault(); // just in case
      // Validate inputs
      let allFilled = true;
      fields.forEach((f) => {
        if (!inputElements[f.key].value) allFilled = false;
      });
      if (!allFilled) {
        alert("Please fill in all fields!");
        return;
      }

      // Get values
      const salary = parseFloat(inputElements.salary.value);
      const freelance = parseFloat(inputElements.freelance.value);
      const netIncome = parseFloat(inputElements.net_income.value);
      const monthlyIncome = salary + freelance + netIncome;

      // Send to backend
      fetch("php/save_income.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          salary,
          freelance,
          net_income: netIncome,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            // Restore close button
            closeBtn.style.display = "inline-block";

            // Update dashboard
            document.getElementById("salary").textContent =
              salary.toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
              });
            document.getElementById("freelance").textContent =
              freelance.toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
              });
            document.getElementById("net_income").textContent =
              netIncome.toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
              });

            document.getElementById("monthly_income").textContent = (
              salary +
              freelance +
              netIncome
            ).toLocaleString("en-PH", {
              style: "currency",
              currency: "PHP",
            });

            modal.classList.remove("show");
            updateCashFlowStatus();
          } else {
            alert("Error saving income data: " + data.message);
          }
        });
    });
  }

  modal.classList.add("show");
}

/*
  ========================================
  

  CASH FLOW STATUS


  ========================================
*/
function updateCashFlowStatus() {
  const expenseBar = document.getElementById("expense-bar");
  const savingBar = document.getElementById("saving-bar");
  const monthlyEl = document.getElementById("monthly_income");
  const balanceEl = document.getElementById("current_balance");

  let monthlyIncome =
    parseFloat(monthlyEl.textContent.replace(/[^0-9.-]+/g, "")) || 0;

  let currentBalance =
    parseFloat(balanceEl.textContent.replace(/[^0-9.-]+/g, "")) || 0;

  if (monthlyIncome === 0) {
    expenseBar.style.width = "0%";
    savingBar.style.width = "0%";
    return;
  }

  // Fetch total expenses from backend
  fetch("php/get_expense_totals.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        let totalExpenses = 0;
        for (const key in data.data) {
          totalExpenses += parseFloat(data.data[key]) || 0;
        }

        // Calculate percentages relative to monthly income
        const expensePercent = (totalExpenses / monthlyIncome) * 100;
        const savingPercent = (currentBalance / monthlyIncome) * 100;

        // Update the bars (max 100%)
        expenseBar.style.width = Math.min(expensePercent, 100) + "%";
        savingBar.style.width = Math.min(savingPercent, 100) + "%";
      }
    })
    .catch((err) => {
      console.error("Error fetching expense totals:", err);
    });
}

// for loadExpenseTotals
document.addEventListener("DOMContentLoaded", function () {
  loadExpenseTotals();
});

/*
  ========================================
  

  PIE CHART


  ========================================
*/
let pieChartInstance;

function renderPieChart(expenseTotals) {
  const categories = [
    "Rent",
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
  ];
  const colors = [
    "#3270e2",
    "#cc3253",
    "#03a26a",
    "#b73a71",
    "#5546d0",
    "#9c52e1",
  ];

  // Get expense amounts in order
  const data = categories.map((cat) => parseFloat(expenseTotals[cat]) || 0);
  const total = data.reduce((a, b) => a + b, 0);

  // Update legend percentages
  categories.forEach((cat, i) => {
    const percentSpan = document.getElementById("percent-" + cat.toLowerCase());
    if (percentSpan) {
      const percent = total ? ((data[i] / total) * 100).toFixed(1) : 0;
      percentSpan.textContent = percent + "%";
    }
  });

  // If chart exists, update it
  if (pieChartInstance) {
    pieChartInstance.data.datasets[0].data = data;
    pieChartInstance.update();
    return;
  }

  // Create chart
  const ctx = document.getElementById("pieChart").getContext("2d");
  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: categories,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  });
}


function loadMonthlyBarChart() {
  fetch("php/get_monthly_overview.php")
    .then((res) => res.json())
    .then((data) => {
      if (data.status !== "success") return;

      const monthlyData = data.data;
      const containers = document.querySelectorAll(".bar-container");

      const monthlyEl = document.getElementById("monthly_income");
      if (!monthlyEl) return;

      const monthlyIncome = parseFloat(
        monthlyEl.textContent.replace(/[^0-9.-]+/g, ""),
      );

      // If monthlyIncome is invalid or 0, just render empty bars
      if (!monthlyIncome || monthlyIncome <= 0) {
        containers.forEach((container) => {
          const savingsBar = container.querySelector(".barchart.savings");
          const expensesBar = container.querySelector(".barchart.expenses");
          if (!savingsBar || !expensesBar) return;
          savingsBar.style.height = "0%";
          expensesBar.style.height = "0%";
        });
        return;
      }

      containers.forEach((container, index) => {
        const savingsBar = container.querySelector(".barchart.savings");
        const expensesBar = container.querySelector(".barchart.expenses");
        if (!savingsBar || !expensesBar) return;

        const { savings = 0, expenses = 0 } = monthlyData[index] || {};

        const savingsPercent = Math.min((savings / monthlyIncome) * 100, 100);
        const expensesPercent = Math.min((expenses / monthlyIncome) * 100, 100);

        savingsBar.style.height = savingsPercent + "%";
        expensesBar.style.height = expensesPercent + "%";

        // Highlight current month
        const currentMonth = new Date().getMonth();
        if (index === currentMonth) container.classList.add("active-month");
        else container.classList.remove("active-month");
      });
    })
    .catch((err) => console.error("Error loading monthly chart:", err));
}

/*
  ========================================
  

  Functions for Viewing Month


  ========================================
*/
function disableEditing() {
  document
    .querySelectorAll(".btn-add, .btn-change, .btn-list")
    .forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = 0.5;
      btn.style.cursor = "not-allowed";
    });
}

function enableEditing() {
  document
    .querySelectorAll(".btn-add, .btn-change, .btn-list")
    .forEach((btn) => {
      btn.disabled = false;
      btn.style.opacity = 1;
      btn.style.cursor = "pointer";
    });
}

function fetchCurrentUserData() {
  fetch("php/get_income.php")
    .then((res) => res.json())
    .then((incomeData) => {
      if (incomeData.status !== "success") return;

      const salary = Number(incomeData.salary || 0);
      const freelance = Number(incomeData.freelance || 0);
      const netIncome = Number(incomeData.net_income || 0);

      document.getElementById("salary").textContent = salary.toLocaleString(
        "en-PH",
        { style: "currency", currency: "PHP" },
      );

      document.getElementById("freelance").textContent =
        freelance.toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        });

      document.getElementById("net_income").textContent =
        netIncome.toLocaleString("en-PH", {
          style: "currency",
          currency: "PHP",
        });

      document.getElementById("monthly_income").textContent = (
        salary +
        freelance +
        netIncome
      ).toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
      });

      refreshCurrentBalance();
      loadExpenseTotals();
      updateCashFlowStatus();
      loadMonthlyBarChart();
    });
}

/*
  ========================================
  

  Logout and Delete Modal Popup


  ========================================
*/
const btnLogout = document.querySelector(".btn-logout");
const btnDelete = document.querySelector(".btn-delete");

if (btnLogout) {
  btnLogout.addEventListener("click", () => openConfirmModal("logout"));
}

if (btnDelete) {
  btnDelete.addEventListener("click", () => openConfirmModal("delete"));
}

function openConfirmModal(type) {
  modalInputs.innerHTML = "";
  modal.classList.add("show");

  const submitButton = document.getElementById("submitBtn");

  if (type === "logout") {
    modalTitle.textContent = "Confirm Logout";
    modalTitle.style.color = "#f59e0b";
    modalText.textContent = "Are you sure you want to logout?";

    submitButton.textContent = "Yes, Logout";
    submitButton.classList.remove("remove-btn");

    // Remove old listeners
    submitButton.replaceWith(submitButton.cloneNode(true));
    const newSubmit = document.getElementById("submitBtn");

    newSubmit.addEventListener("click", () => {
      toLogin();
    });
  } else if (type === "delete") {
    modalTitle.textContent = "Delete Account";
    modalTitle.style.color = "#ef4444";
    modalText.textContent =
      "This action is permanent. Please enter your password to confirm.";

    modalInputs.innerHTML = "";

    // Create password field
    const passwordLabel = document.createElement("label");
    passwordLabel.textContent = "Enter Password";
    passwordLabel.style.color = "#ef4444";

    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Enter your password...";
    passwordInput.required = true;

    modalInputs.appendChild(passwordLabel);
    modalInputs.appendChild(passwordInput);

    const submitButton = document.getElementById("submitBtn");
    submitButton.textContent = "Delete Account";
    submitButton.classList.add("remove-btn");

    // Remove old listeners
    submitButton.replaceWith(submitButton.cloneNode(true));
    const newSubmit = document.getElementById("submitBtn");

    newSubmit.addEventListener("click", () => {
      const password = passwordInput.value.trim();

      if (!password) {
        alert("Please enter your password.");
        return;
      }

      fetch("php/delete_account.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            alert("Account deleted successfully.");
            toLogin();
          } else {
            alert(data.message || "Failed to delete account.");
          }
        })
        .catch((err) => {
          console.error(err);
          alert("Error deleting account.");
        });
    });
  }
}
