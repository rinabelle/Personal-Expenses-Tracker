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

// DASHBOARD TOTALS
app.get('/dashboard-totals/:user_id', (req, res) => {
    const userId = req.params.user_id;
    
    const month = req.query.month || (new Date().getMonth() + 1);
    const year = req.query.year || new Date().getFullYear();

    const query = `
        SELECT current_balance 
        FROM monthly 
        WHERE user_id = ? AND month = ? AND year = ? 
        LIMIT 1`;

    db.query(query, [userId, month, year], (err, results) => {
        if (err) {
            console.error("Backend Error:", err);
            return res.status(500).json({ status: "error" });
        }
        
        const balance = results.length > 0 ? results[0].current_balance : 0;
        res.json({ status: "success", current_balance: balance });
    });
});

// DELETE ACCOUNT ROUTE
app.delete("/delete-user/:id", async (req, res) => {
    const user_id = req.params.id;
    console.log("Attempting to delete user:", user_id);

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        await connection.query("DELETE FROM expenses WHERE user_id = ?", [user_id]);
        await connection.query("DELETE FROM income WHERE user_id = ?", [user_id]);
        await connection.query("DELETE FROM monthly WHERE user_id = ?", [user_id]);
        await connection.query("DELETE FROM users WHERE id = ?", [user_id]);

        await connection.commit();

        console.log("User and all related records deleted successfully.");
        res.json({ status: "success", message: "Account deleted successfully" });

    } catch (err) {
        await connection.rollback();
        console.error("Delete Transaction Error:", err);
        res.status(500).json({ status: "error", message: "Transaction failed: " + err.message });

    } finally {
        connection.release();
    }
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

// list Breakdown table
app.get("/transactions/:user_id", (req, res) => {
    const { user_id } = req.params;
    const sql = "SELECT category, amount, expense_date FROM expenses WHERE user_id = ? ORDER BY expense_date DESC LIMIT 10";
    
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// SIGN-UP
app.post("/signup", async (req, res) => {
    const { display_name, email, password, starting_balance } = req.body;

    if (!display_name || !email || !password || starting_balance === undefined) {
        return res.json({ status: "error", message: "All fields are required." });
    }

    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.json({ status: "error", message: err.message });
        if (results.length > 0) return res.json({ status: "error", message: "Email already exists." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const balance = parseFloat(starting_balance);
        const now = new Date();

        db.getConnection((err, connection) => {
            if (err) return res.json({ status: "error", message: "Database connection failed" });

            connection.beginTransaction(async (err) => {
                try {
                    const [userResult] = await connection.promise().query(
                        "INSERT INTO users (display_name, email, password, starting_balance) VALUES (?, ?, ?, ?)",
                        [display_name, email, hashedPassword, balance]
                    );
                    const user_id = userResult.insertId;

                    await connection.promise().query(
                        "INSERT INTO monthly (user_id, month, year, month_income, current_balance) VALUES (?, ?, ?, ?, ?)",
                        [user_id, now.getMonth() + 1, now.getFullYear(), balance, balance]
                    );

                    await connection.promise().query(
                        "INSERT INTO income (user_id, starting_money, salary, freelance, business, income_date) VALUES (?, ?, 0, 0, 0, ?)",
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

// LOGIN
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

// FORGOT PASSWORD
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

app.post("/add-income/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { source, amount } = req.body;
    const incomeAmount = parseFloat(amount) || 0;
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let salary = source === "Salary" ? incomeAmount : 0;
    let freelance = source === "Freelance" ? incomeAmount : 0;
    let business = source === "Business" ? incomeAmount : 0;

    const insertIncome = `INSERT INTO income (user_id, starting_money, salary, freelance, business, income_date) VALUES (?, 0, ?, ?, ?, NOW())`;

    db.query(insertIncome, [user_id, salary, freelance, business], (err) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });

        const updateMonthly = `
            UPDATE monthly 
            SET month_income = month_income + ?, 
                current_balance = current_balance + ? 
            WHERE user_id = ? AND month = ? AND year = ?`;
        
        db.query(updateMonthly, [incomeAmount, incomeAmount, user_id, currentMonth, currentYear], (err2, result) => {
            if (err2) return res.status(500).json({ status: "error", message: err2.message });
            
            if (result.affectedRows === 0) {
                const sqlGetLastRecord = `SELECT current_balance, month_income FROM monthly WHERE user_id = ? ORDER BY year DESC, month DESC LIMIT 1`;
                
                db.query(sqlGetLastRecord, [user_id], (err3, lastRes) => {
                    const lastBalance = lastRes.length > 0 ? parseFloat(lastRes[0].current_balance) : 0;
                    const lastTotalIncome = lastRes.length > 0 ? parseFloat(lastRes[0].month_income) : 0;
                    
                    const newBalance = lastBalance + incomeAmount;
                    const newTotalIncome = lastTotalIncome + incomeAmount;
                    const createMonthly = `
                        INSERT INTO monthly (user_id, month, year, month_income, current_balance, total_expense) 
                        VALUES (?, ?, ?, ?, ?, 0)`;
                        
                    db.query(createMonthly, [user_id, currentMonth, currentYear, newTotalIncome, newBalance], (err4) => {
                        if (err4) return res.status(500).json({ status: "error", message: err4.message });
                        res.json({ status: "success", message: "Income added and carry-over record created!" });
                    });
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
            SUM(business) as total_business 
        FROM income 
        WHERE user_id = ?`;

    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        const data = results[0] || {};
        res.json({
            status: "success",
            starting_money: parseFloat(data.total_starting) || 0,
            salary: parseFloat(data.total_salary) || 0,
            freelance: parseFloat(data.total_freelance) || 0,
            business: parseFloat(data.total_business) || 0
        });
    });
});

// EXPENSES SYSTEM
app.post("/add-expense/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { category, amount } = req.body;
    const expenseAmount = parseFloat(amount) || 0;
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Insert the actual expense record
    const sqlInsertExpense = `INSERT INTO expenses (user_id, category, amount, expense_date) VALUES (?, ?, ?, NOW())`;
    
    db.query(sqlInsertExpense, [user_id, category, expenseAmount], (err) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });

        // 2. Try to update the monthly summary for the current month
        const sqlUpdateMonthly = `
            UPDATE monthly 
            SET current_balance = current_balance - ?, 
                total_expense = total_expense + ? 
            WHERE user_id = ? AND month = ? AND year = ?`;
        
        db.query(sqlUpdateMonthly, [expenseAmount, expenseAmount, user_id, currentMonth, currentYear], (err2, result) => {
            if (err2) return res.status(500).json({ status: "error", message: err2.message });
            
            // 3. IF NO RECORD EXISTS YET FOR THIS MONTH
            if (result.affectedRows === 0) {
                const sqlGetLastData = `SELECT current_balance, month_income FROM monthly WHERE user_id = ? ORDER BY year DESC, month DESC LIMIT 1`;
                
                db.query(sqlGetLastData, [user_id], (err3, lastRes) => {
                    const lastBalance = lastRes.length > 0 ? parseFloat(lastRes[0].current_balance) : 0;
                    const lastIncome = lastRes.length > 0 ? parseFloat(lastRes[0].month_income) : 0;
                    
                    const newBalance = lastBalance - expenseAmount;

                    const sqlCreateMonthly = `
                        INSERT INTO monthly (user_id, month, year, month_income, current_balance, total_expense) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
                    
                    db.query(sqlCreateMonthly, [user_id, currentMonth, currentYear, lastIncome, newBalance, expenseAmount], (err4) => {
                        if (err4) return res.status(500).json({ status: "error", message: err4.message });
                        res.json({ status: "success", message: "Expense added and new monthly record started!" });
                    });
                });
            } else {
                res.json({ status: "success", message: "Expense added successfully!" });
            }
        });
    });
});

app.get("/expenses-data/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { month, year } = req.query;

    const targetMonth = month || (new Date().getMonth() + 1);
    const targetYear = year || new Date().getFullYear();

    const sql = `
        SELECT 
            SUM(CASE WHEN category = 'Rent' THEN amount ELSE 0 END) as Rent,
            SUM(CASE WHEN category = 'Food' THEN amount ELSE 0 END) as Food,
            SUM(CASE WHEN category = 'Transport' THEN amount ELSE 0 END) as Transport,
            SUM(CASE WHEN category = 'Shopping' THEN amount ELSE 0 END) as Shopping,
            SUM(CASE WHEN category = 'Bills' THEN amount ELSE 0 END) as Bills,
            SUM(CASE WHEN category = 'Entertainment' THEN amount ELSE 0 END) as Entertainment,
            SUM(amount) as total_all 
        FROM expenses 
        WHERE user_id = ? 
          AND MONTH(expense_date) = ? 
          AND YEAR(expense_date) = ?`;

    db.query(sql, [user_id, targetMonth, targetYear], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        const data = results[0] || {}; 
        
        res.json({
            Rent: parseFloat(data.Rent) || 0,
            Food: parseFloat(data.Food) || 0,
            Transport: parseFloat(data.Transport) || 0,
            Shopping: parseFloat(data.Shopping) || 0,
            Bills: parseFloat(data.Bills) || 0,
            Entertainment: parseFloat(data.Entertainment) || 0,
            total_expense: parseFloat(data.total_all) || 0
        });
    });
});

app.get('/api/monthly-stats/:user_id', (req, res) => {
    const userId = req.params.user_id;
    const { month, year } = req.query;

    let query = `
        SELECT month, year, month_income, total_expense 
        FROM monthly 
        WHERE user_id = ?`;
    
    let params = [userId];

    if (month && year) {
        query += ` AND month = ? AND year = ?`;
        params.push(month, year);
    }

    query += ` ORDER BY year ASC, month ASC`;

    db.query(query, params, (err, results) => {
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

//  MONTH FILTER ROUTE
app.get("/overview/filter/:month", (req, res) => {
    let month = req.params.month;
    const { user_id, year } = req.query;
    const filterYear = year || new Date().getFullYear();

    if (!month || month === "undefined" || month === "null") {
        month = new Date().getMonth() + 1; 
    }

    if (!user_id) return res.status(400).json({ status: "error", message: "User ID required" });

    const expenseSql = `
        SELECT category, SUM(amount) as total 
        FROM expenses 
        WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?
        GROUP BY category`;

    db.query(expenseSql, [user_id, month, filterYear], (err, expenseResults) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });

        const expenseData = { Rent: 0, Food: 0, Transport: 0, Shopping: 0, Bills: 0, Entertainment: 0 };
        expenseResults.forEach(row => {
            if (expenseData.hasOwnProperty(row.category)) expenseData[row.category] = parseFloat(row.total) || 0;
        });

        const incomeSql = `
            SELECT 
                SUM(salary) as salary, 
                SUM(freelance) as freelance, 
                SUM(business) as business, 
                SUM(starting_money) as starting_money 
            FROM income 
            WHERE user_id = ? AND MONTH(income_date) = ? AND YEAR(income_date) = ?`;

        db.query(incomeSql, [user_id, month, filterYear], (err, incomeResults) => {
            if (err) return res.status(500).json({ status: "error", message: err.message });

            const inc = incomeResults[0] || { salary: 0, freelance: 0, business: 0, starting_money: 0 };
            
            const totalInc = (parseFloat(inc.salary) || 0) + 
                             (parseFloat(inc.freelance) || 0) + 
                             (parseFloat(inc.business) || 0) + 
                             (parseFloat(inc.starting_money) || 0);
            
            const totalExp = Object.values(expenseData).reduce((a, b) => a + b, 0);

            res.json({ 
                status: "success", 
                income_details: inc, 
                data: expenseData, 
                balance: totalInc - totalExp 
            });
        });
    });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});