// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "finance_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
    connection.release();
  }
});

///////////////////////////
// DASHBOARD
///////////////////////////
app.get("/dashboard-totals/:user_id", (req, res) => {
    const { user_id } = req.params;
    
    const query = `
      SELECT u.starting_balance, 
      (SELECT current_balance FROM monthly_balance WHERE user_id = u.id ORDER BY id DESC LIMIT 1) as current_balance
      FROM users u 
      WHERE u.id = ?`;

    db.query(query, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        console.log("Database Results:", results[0]); 
        res.json({ 
            status: "success", 
            current_balance: results[0].current_balance || 0 
        });
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
                    // A. Insert User
                    const [userResult] = await connection.promise().query(
                        "INSERT INTO users (display_name, email, password, starting_balance) VALUES (?, ?, ?, ?)",
                        [display_name, email, hashedPassword, balance]
                    );
                    const user_id = userResult.insertId;

                    // B. Insert Monthly Balance
                    await connection.promise().query(
                        "INSERT INTO monthly_balance (user_id, month, year, month_income, current_balance) VALUES (?, ?, ?, ?, ?)",
                        [user_id, now.getMonth() + 1, now.getFullYear(), balance, balance]
                    );

                    // C. Insert Income
                    await connection.promise().query(
                        "INSERT INTO income (user_id, starting_money, salary, freelance, net_income, income_date) VALUES (?, ?, 0, 0, 0, ?)",
                        [user_id, balance, now.toISOString().split("T")[0]]
                    );

                    // D. Insert Expenses
                    await connection.promise().query(
                        "INSERT INTO expenses (user_id, Rent, Food, Transport, Shopping, Bills, Entertainment) VALUES (?, 0, 0, 0, 0, 0, 0)",
                        [user_id]
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
// INCOME
///////////////////////////
app.post("/income", (req, res) => {
  const { user_id, salary, freelance, net_income, income_date } = req.body;
  if (!user_id || net_income === undefined || !income_date) return res.json({ status: "error", message: "Required fields missing." });

  db.query(
    "INSERT INTO income (user_id, salary, freelance, net_income, income_date) VALUES (?, ?, ?, ?, ?)",
    [user_id, salary || 0, freelance || 0, net_income, income_date],
    (err, result) => {
      if (err) return res.json({ status: "error", message: err.message });
      res.json({ status: "success", income_id: result.insertId });
    }
  );
});

app.get("/income/:user_id", (req, res) => {
  const { user_id } = req.params;
  db.query("SELECT * FROM income WHERE user_id = ?", [user_id], (err, results) => {
    if (err) return res.json({ status: "error", message: err.message });
    res.json({ status: "success", data: results });
  });
});

app.post("/add-income/:user_id", (req, res) => {
  const { user_id } = req.params;
  const { source, amount } = req.body;
  const date = new Date().toISOString().split("T")[0];

  let column = "net_income";
  if (source === "Salary") column = "salary";
  if (source === "Freelance") column = "freelance";

  const incomeQuery = `UPDATE income SET ${column} = ${column} + ? WHERE user_id = ? ORDER BY id DESC LIMIT 1`;
  
  db.query(incomeQuery, [amount, user_id], (err) => {
    if (err) return res.json({ status: "error", message: err.message });

    db.query(
      "UPDATE monthly_balance SET month_income = month_income + ?, current_balance = current_balance + ? WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [amount, amount, user_id],
      (err2) => {
        if (err2) return res.json({ status: "error", message: err2.message });
        res.json({ status: "success", message: "Income added and balance updated" });
      }
    );
  });
});

///////////////////////////
// EXPENSES
///////////////////////////
app.get("/expenses-data/:user_id", (req, res) => {
  const { user_id } = req.params;
  db.query("SELECT Rent, Food, Transport, Shopping, Bills, Entertainment FROM expenses WHERE user_id = ?", [user_id], (err, results) => {
    if (err) return res.json({ status: "error", message: err.message });
    if (results.length === 0) return res.json({ status: "success", data: { Rent: 0, Food: 0, Transport: 0, Shopping: 0, Bills: 0, Entertainment: 0 } });
    
    res.json({ status: "success", data: results[0] });
  });
});

app.post("/add-expense/:user_id", (req, res) => {
  const { user_id } = req.params;
  const { category, amount } = req.body;

  const validCategories = ["Rent", "Food", "Transport", "Shopping", "Bills", "Entertainment"];
  if (!validCategories.includes(category)) {
    return res.json({ status: "error", message: "Invalid category" });
  }

  const query = `UPDATE expenses SET \`${category}\` = \`${category}\` + ? WHERE user_id = ?`;

  db.query(query, [parseFloat(amount), user_id], (err) => {
    if (err) return res.json({ status: "error", message: err.message });

    db.query(
      "UPDATE monthly_balance SET current_balance = current_balance - ? WHERE user_id = ? ORDER BY id DESC LIMIT 1",
      [parseFloat(amount), user_id],
      (err2) => {
        if (err2) return res.json({ status: "error", message: err2.message });
        res.json({ status: "success", message: "Expense updated" });
      }
    );
  });
});

// GET CURRENT BALANCE
app.get("/balance/:user_id", (req, res) => {
  const { user_id } = req.params;

  db.query(
    "SELECT current_balance FROM monthly_balance WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    [user_id],
    (err, results) => {
      if (err) return res.json({ status: "error", message: err.message });

      if (results.length === 0) {
        return res.json({ status: "success", balance: 0 });
      }

      res.json({
        status: "success",
        balance: results[0].current_balance
      });
    }
  );
});

app.get('/api/monthly-stats/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT month, month_income, current_balance 
        FROM monthly_balance 
        WHERE user_id = ? 
        ORDER BY year DESC, month DESC 
        LIMIT 12`;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching stats:", err);
            return res.status(500).json({ status: "error", message: err.message });
        }
        
        if (!results || results.length === 0) {
            return res.json({ labels: [], income: [], expenses: [] });
        }
        
        const data = results.reverse(); 
        
        res.json({ 
            labels: data.map(r => `Month ${r.month}`),
            income: data.map(r => r.month_income),
            expenses: data.map(r => Math.max(0, r.month_income - r.current_balance))
        });
    });
});

///////////////////////////
// START SERVER
///////////////////////////
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});