const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "finance_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

///////////////////////////
// DASHBOARD TOTALS (FIXED)
///////////////////////////
app.get("/dashboard-totals/:user_id", (req, res) => {
    const { user_id } = req.params;
    // Kukunin ang pinakabagong balance mula sa monthly table
    const query = "SELECT current_balance FROM monthly WHERE user_id = ? ORDER BY id DESC LIMIT 1";

    db.query(query, [user_id], (err, results) => {
        if (err) {
            console.error("Dashboard Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            status: "success", 
            current_balance: results.length > 0 ? results[0].current_balance : 0 
        });
    });
});

///////////////////////////
// DELETE ACCOUNT ROUTE
///////////////////////////
app.delete("/delete-user/:id", (req, res) => {
    const user_id = req.params.id;
    console.log("Attempting to delete user:", user_id);

    const q1 = "DELETE FROM expenses WHERE user_id = ?";
    const q2 = "DELETE FROM income WHERE user_id = ?";
    const q3 = "DELETE FROM monthly WHERE user_id = ?";
    const q4 = "DELETE FROM users WHERE id = ?";

    db.query(q1, [user_id], (err) => {
        if (err) return res.status(500).json({ status: "error", message: "Expenses delete failed: " + err.message });

        db.query(q2, [user_id], (err) => {
            if (err) return res.status(500).json({ status: "error", message: "Income delete failed: " + err.message });

            db.query(q3, [user_id], (err) => {
                if (err) return res.status(500).json({ status: "error", message: "Monthly balance delete failed: " + err.message });

                db.query(q4, [user_id], (err) => {
                    if (err) return res.status(500).json({ status: "error", message: "User delete failed: " + err.message });
                    
                    console.log("User and all related records deleted successfully.");
                    res.json({ status: "success", message: "Account deleted successfully" });
                });
            });
        });
    });
});

app.get("/balance/:user_id", (req, res) => {
    const { user_id } = req.params;
    const sql = `
        SELECT current_balance, total_expense 
        FROM monthly 
        WHERE user_id = ? 
        ORDER BY id DESC LIMIT 1`;

    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json({ current_balance: 0, total_expense: 0 });
        res.json(results[0]);
    });
});

// Kunin ang listahan ng transactions para sa Breakdown table
app.get("/transactions/:user_id", (req, res) => {
    const { user_id } = req.params;
    const sql = "SELECT category, amount, expense_date FROM expenses WHERE user_id = ? ORDER BY expense_date DESC LIMIT 10";
    
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

///////////////////////////
// SIGN-UP
///////////////////////////
app.post("/signup", async (req, res) => {
    const { display_name, email, password, starting_balance } = req.body;

    if (!display_name || !email || !password || starting_balance === undefined) {
        return res.json({ status: "error", message: "All fields are required." });
    }

    // 1. Check kung existing na ang email
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.json({ status: "error", message: err.message });
        if (results.length > 0) return res.json({ status: "error", message: "Email already exists." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const balance = parseFloat(starting_balance);
        const now = new Date();

        // 2. Simulan ang Transaction
        db.getConnection((err, connection) => {
            if (err) return res.json({ status: "error", message: "Database connection failed" });

            connection.beginTransaction(async (err) => {
                try {
                    //Insert User
                    const [userResult] = await connection.promise().query(
                        "INSERT INTO users (display_name, email, password, starting_balance) VALUES (?, ?, ?, ?)",
                        [display_name, email, hashedPassword, balance]
                    );
                    const user_id = userResult.insertId;

                    // Insert Monthly Balance
                    await connection.promise().query(
                        "INSERT INTO monthly (user_id, month, year, month_income, current_balance) VALUES (?, ?, ?, ?, ?)",
                        [user_id, now.getMonth() + 1, now.getFullYear(), balance, balance]
                    );

                    // Insert Income
                    await connection.promise().query(
                        "INSERT INTO income (user_id, starting_money, salary, freelance, net_income, income_date) VALUES (?, ?, 0, 0, 0, ?)",
                        [user_id, balance, now.toISOString().split("T")[0]]
                    );

                    connection.commit();
                    res.json({ status: "success", user_id });
                } catch (error) {
                    connection.rollback();
                    res.json({ status: "error", message: error.message });
                } finally {
                    connection.release();
                }
            });
        });
    });
});

///////////////////////////
// LOGIN
///////////////////////////
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ status: "error", message: "Email and password required." });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

    if (err) {
      console.error(err);
      return res.json({ status: "error", message: "Database error" });
    }
    if (results.length === 0) {
      return res.json({ status: "error", message: "User not found." });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.json({ status: "error", message: "Incorrect password." });
    }

    res.json({
      status: "success",
      user_id: user.id,
      display_name: user.display_name
    });

  });
});

///////////////////////////
// FORGOT PASSWORD
///////////////////////////
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ status: "error", message: "Email is required." });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.json({ status: "error", message: err.message });
    if (results.length === 0) return res.json({ status: "error", message: "Email not found." });

    const token = crypto.randomBytes(20).toString("hex");
    const expires_at = new Date(Date.now() + 3600 * 1000);
    db.query(
      "INSERT INTO password_reset (email, token, expires_at) VALUES (?, ?, ?)",
      [email, token, expires_at],
      (err2) => {
        if (err2) return res.json({ status: "error", message: err2.message });
 
        res.json({ status: "success", message: `Reset link generated. Token: ${token}` });
      }
    );
  });
});

///////////////////////////
// INCOME SYSTEM (FIXED)
///////////////////////////
app.post("/add-income/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { source, amount } = req.body;
    const incomeAmount = parseFloat(amount) || 0;
    const date = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let salary = source === "Salary" ? incomeAmount : 0;
    let freelance = source === "Freelance" ? incomeAmount : 0;
    let business = source === "Business" ? incomeAmount : 0;

    const insertIncome = `INSERT INTO income (user_id, starting_money, salary, freelance, net_income, income_date) VALUES (?, 0, ?, ?, ?, ?)`;

    db.query(insertIncome, [user_id, salary, freelance, business, date], (err) => {
        if (err) return res.status(500).json({ status: "error", message: "Income Insert Error: " + err.message });

        const updateMonthly = `
            UPDATE monthly 
            SET month_income = month_income + ?, 
                current_balance = current_balance + ? 
            WHERE user_id = ? AND month = ? AND year = ?`;
        
        db.query(updateMonthly, [incomeAmount, incomeAmount, user_id, currentMonth, currentYear], (err2, result) => {
            if (err2) return res.status(500).json({ status: "error", message: "Monthly Update Error: " + err2.message });
            
            if (result.affectedRows === 0) {
                const createMonthly = `INSERT INTO monthly (user_id, month, year, month_income, current_balance, total_expense) VALUES (?, ?, ?, ?, ?, 0)`;
                db.query(createMonthly, [user_id, currentMonth, currentYear, incomeAmount, incomeAmount], (err3) => {
                    if (err3) return res.status(500).json({ status: "error", message: err3.message });
                    res.json({ status: "success", message: "New monthly record created!" });
                });
            } else {
                res.json({ status: "success", message: "Income added and balance updated!" });
            }
        });
    });
});

app.get("/income-summary/:user_id", (req, res) => {
    const { user_id } = req.params;
    const sql = `
        SELECT 
            SUM(starting_money) as total_starting,
            SUM(salary) as total_salary, 
            SUM(freelance) as total_freelance, 
            SUM(net_income) as total_business 
        FROM income 
        WHERE user_id = ?`;

    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        const data = results[0] || {};
        res.json({
            status: "success",
            starting: parseFloat(data.total_starting) || 0,
            salary: parseFloat(data.total_salary) || 0,
            freelance: parseFloat(data.total_freelance) || 0,
            business: parseFloat(data.total_business) || 0
        });
    });
});

///////////////////////////
// EXPENSES SYSTEM
///////////////////////////
app.post("/add-expense/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { category, amount } = req.body;
    const expenseAmount = parseFloat(amount) || 0;
    const date = new Date().toISOString().split("T")[0];

    // I-map ang category sa tamang column name
    let rent = category === "Rent" ? expenseAmount : 0;
    let food = category === "Food" ? expenseAmount : 0;
    let transport = category === "Transport" ? expenseAmount : 0;
    let shopping = category === "Shopping" ? expenseAmount : 0;
    let bills = category === "Bills" ? expenseAmount : 0;
    let entertainment = category === "Entertainment" ? expenseAmount : 0;

    const sql = `INSERT INTO expenses (user_id, rent, food, transport, shopping, bills, entertainment, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [user_id, rent, food, transport, shopping, bills, entertainment, date], (err) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });

        // UPDATE monthly balance (Bawasan ang current_balance)
        const updateMonthly = `UPDATE monthly SET current_balance = current_balance - ?, total_expense = total_expense + ? WHERE user_id = ? AND month = MONTH(CURRENT_DATE()) AND year = YEAR(CURRENT_DATE())`;
        
        db.query(updateMonthly, [expenseAmount, expenseAmount, user_id], (err2) => {
            if (err2) return res.status(500).json({ status: "error", message: err2.message });
            res.json({ status: "success", message: "Expense added!" });
        });
    });
});

app.get("/expenses-data/:user_id", (req, res) => {
    const { user_id } = req.params;

    const sql = `
        SELECT 
            SUM(CASE WHEN category = 'Rent' THEN amount ELSE 0 END) as Rent,
            SUM(CASE WHEN category = 'Food' THEN amount ELSE 0 END) as Food,
            SUM(CASE WHEN category = 'Transport' THEN amount ELSE 0 END) as Transport,
            SUM(CASE WHEN category = 'Shopping' THEN amount ELSE 0 END) as Shopping,
            SUM(CASE WHEN category = 'Bills' THEN amount ELSE 0 END) as Bills,
            SUM(CASE WHEN category = 'Entertainment' THEN amount ELSE 0 END) as Entertainment
        FROM expenses 
        WHERE user_id = ? AND MONTH(expense_date) = MONTH(CURRENT_DATE())`;

    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error("SQL Error:", err.message);
            return res.status(500).json({ status: "error", message: err.message });
        }
        
        const data = results[0];
        res.json({
            Rent: parseFloat(data.Rent) || 0,
            Food: parseFloat(data.Food) || 0,
            Transport: parseFloat(data.Transport) || 0,
            Shopping: parseFloat(data.Shopping) || 0,
            Bills: parseFloat(data.Bills) || 0,
            Entertainment: parseFloat(data.Entertainment) || 0
        });
    });
});

app.get('/api/monthly-stats/:user_id', (req, res) => {
    const userId = req.params.user_id;
    
    const query = `
        SELECT month, year, month_income, total_expense 
        FROM monthly 
        WHERE user_id = ? 
        ORDER BY year ASC, month ASC`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json({ error: "Database error" });
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", 
                            "July", "August", "September", "October", "November", "December"];

        const labels = results.map(row => `${monthNames[row.month - 1]} ${row.year}`);
        const income = results.map(row => parseFloat(row.month_income) || 0);
        const expenses = results.map(row => parseFloat(row.total_expense) || 0);

        res.json({ labels, income, expenses });
    });
});

app.get("/overview/filter/:period", (req, res) => {
    const { period } = req.params; // Ito yung month number
    const { user_id, year } = req.query; // Kunin ang year mula sa frontend
    const filterYear = year || new Date().getFullYear();

    if (!user_id) return res.status(400).json({ status: "error", message: "User ID required" });

    // 1. Gawing dynamic ang Year at Month sa constraint
    let timeConstraint = "AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?";
    let incomeConstraint = "AND MONTH(income_date) = ? AND YEAR(income_date) = ?";
    let params = [user_id, period, filterYear];

    // 2. Query para sa Expenses
    const expenseSql = `
        SELECT category, SUM(amount) as total 
        FROM expenses 
        WHERE user_id = ? ${timeConstraint}
        GROUP BY category`;

    db.query(expenseSql, params, (err, expenseResults) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });

        const expenseData = { Rent: 0, Food: 0, Transport: 0, Shopping: 0, Bills: 0, Entertainment: 0 };
        expenseResults.forEach(row => {
            if (expenseData.hasOwnProperty(row.category)) expenseData[row.category] = parseFloat(row.total) || 0;
        });

        // 3. Query para sa Income (DITO NATIN ISASAMA ANG STARTING_MONEY AT NET_INCOME)
        const incomeSql = `
            SELECT 
                SUM(salary) as salary, 
                SUM(freelance) as freelance, 
                SUM(net_income) as net_income, 
                SUM(starting_money) as starting_money 
            FROM income 
            WHERE user_id = ? ${incomeConstraint}`;

        db.query(incomeSql, params, (err, incomeResults) => {
            if (err) return res.status(500).json({ status: "error", message: err.message });

            const inc = incomeResults[0] || { salary: 0, freelance: 0, net_income: 0, starting_money: 0 };

            // 4. Kalkulahin ang Balance para sa Dashboard
            const totalInc = (parseFloat(inc.salary) || 0) + 
                             (parseFloat(inc.freelance) || 0) + 
                             (parseFloat(inc.net_income) || 0) + 
                             (parseFloat(inc.starting_money) || 0);
            
            const totalExp = Object.values(expenseData).reduce((a, b) => a + b, 0);

            // 5. IBALIK LAHAT SA FRONTEND
            res.json({ 
                status: "success", 
                data: expenseData, 
                income_details: inc, 
                balance: totalInc - totalExp 
            });
        });
    });
});


///////////////////////////
//  MONTH FILTER ROUTE
///////////////////////////
app.get("/overview/filter/:month", (req, res) => {
    const month = req.params.month;
    const user_id = req.query.user_id;

    // 1. Query para sa Income
    const incomeSql = `
        SELECT 
            SUM(salary) as salary, 
            SUM(freelance) as freelance, 
            SUM(business) as net_income, 
            SUM(starting_money) as starting_money 
        FROM monthly 
        WHERE user_id = ? AND month_id = ?`;

    // 2. Query para sa Expenses (Kailangan mo rin ito para sa Breakdown)
    const expenseSql = `
        SELECT category, SUM(amount) as total 
        FROM expenses 
        WHERE user_id = ? AND MONTH(expense_date) = ? 
        GROUP BY category`;

    db.query(incomeSql, [user_id, month], (err, incomeRows) => {
        if (err) return res.json({ status: "error", message: "Income query failed" });

        db.query(expenseSql, [user_id, month], (err, expenseRows) => {
            if (err) return res.json({ status: "error", message: "Expense query failed" });

            // I-format ang Expenses
            const formattedExpenses = { Rent: 0, Food: 0, Transport: 0, Shopping: 0, Bills: 0, Entertainment: 0 };
            expenseRows.forEach(row => {
                if (formattedExpenses.hasOwnProperty(row.category)) {
                    formattedExpenses[row.category] = parseFloat(row.total) || 0;
                }
            });

            // I-compute ang total balance (Income - Total Expenses)
            const inc = incomeRows[0] || {};
            const totalInc = (parseFloat(inc.salary) || 0) + (parseFloat(inc.freelance) || 0) + (parseFloat(inc.net_income) || 0) + (parseFloat(inc.starting_money) || 0);
            const totalExp = Object.values(formattedExpenses).reduce((a, b) => a + b, 0);
            const currentBalance = totalInc - totalExp;

            // ISAMA LAHAT SA RESPONSE
            res.json({ 
                status: "success", 
                income_details: inc,    // Dito manggagaling yung Salary, Freelance, etc.
                data: formattedExpenses, // Dito yung Rent, Food, etc.
                balance: currentBalance  // Para sa Current Balance box
            });
        });
    });
});

///////////////////////////
// START SERVER
///////////////////////////
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});