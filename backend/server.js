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

db.getConnection((err, connection) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL - Ready for Requests");
    connection.release();
  }
});

app.use((req, res, next) => {
    console.log(`${req.method} request received at ${req.url}`);
    next();
});

///////////////////////////
// DELETE ACCOUNT ROUTE
///////////////////////////
app.delete("/delete-user/:id", (req, res) => {
    const user_id = req.params.id;
    console.log("Attempting to delete user:", user_id);

    const q1 = "DELETE FROM expenses WHERE user_id = ?";
    const q2 = "DELETE FROM income WHERE user_id = ?";
    const q3 = "DELETE FROM monthly_balance WHERE user_id = ?";
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
// EXPENSES SYSTEM
///////////////////////////
app.post("/add-expense/:user_id", (req, res) => {
    const { user_id } = req.params;
    const { category, amount } = req.body;
    const expenseAmount = parseFloat(amount) || 0;

    let column = "";
    if (category === "Rent") column = "Rent";
    else if (category === "Food") column = "Food";
    else if (category === "Transport") column = "Transport";
    else if (category === "Shopping") column = "Shopping";
    else if (category === "Bills") column = "Bills";
    else if (category === "Entertainment") column = "Entertainment";

    if (!column) {
        return res.json({ status: "error", message: "Invalid category: " + category });
    }

    const expenseQuery = `UPDATE expenses SET ${column} = ${column} + ? WHERE user_id = ? ORDER BY id DESC LIMIT 1`;

    db.query(expenseQuery, [expenseAmount, user_id], (err) => {
        if (err) return res.json({ status: "error", message: "Expense Table Error: " + err.message });

        const balanceQuery = `
            UPDATE monthly_balance 
            SET total_expense = total_expense + ?, 
                current_balance = current_balance - ? 
            WHERE user_id = ? 
            ORDER BY id DESC LIMIT 1`;

        db.query(balanceQuery, [expenseAmount, expenseAmount, user_id], (err2) => {
            if (err2) return res.json({ status: "error", message: "Balance Table Error: " + err2.message });
            
            console.log(`SUCCESS: User ${user_id} spent ₱${expenseAmount} on ${column}`);
            res.json({ status: "success", message: "Expense recorded successfully" });
        });
    });
});

app.get("/expenses-data/:user_id", (req, res) => {
    const { user_id } = req.params;
    
    const sql = `
        SELECT 
            SUM(Rent) as Rent, 
            SUM(Food) as Food, 
            SUM(Transport) as Transport, 
            SUM(Shopping) as Shopping, 
            SUM(Bills) as Bills, 
            SUM(Entertainment) as Entertainment 
        FROM expenses 
        WHERE user_id = ?`;

    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        const data = results[0] || {};
        res.json({
            status: "success",
            data: {
                Rent: parseFloat(data.Rent) || 0,
                Food: parseFloat(data.Food) || 0,
                Transport: parseFloat(data.Transport) || 0,
                Shopping: parseFloat(data.Shopping) || 0,
                Bills: parseFloat(data.Bills) || 0,
                Entertainment: parseFloat(data.Entertainment) || 0
            }
        });
    });
});

app.get('/api/monthly-stats/:user_id', (req, res) => {
    const userId = req.params.user_id;
    
    const query = `
        SELECT month, year, month_income, total_expense 
        FROM monthly_balance 
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

app.get("/overview/month/:period", (req, res) => {
    const { period } = req.params;
    const { user_id } = req.query;

    if (!user_id) return res.status(400).json({ status: "error", message: "User ID required" });

    let timeConstraint = "";
    if (period === "Last Week") {
        timeConstraint = "AND date_created >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } else if (period === "Last Month") {
        timeConstraint = "AND date_created >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    } else if (period === "This Year") {
        timeConstraint = "AND YEAR(date_created) = YEAR(NOW())";
    }

    const sql = `SELECT Rent, Food, Transport, Shopping, Bills, Entertainment 
                 FROM expenses 
                 WHERE user_id = ? ${timeConstraint} 
                 ORDER BY id DESC LIMIT 1`;

    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        const data = results[0] || { Rent: 0, Food: 0, Transport: 0, Shopping: 0, Bills: 0, Entertainment: 0 };
        res.json({ status: "success", data: data });
    });
});

///////////////////////////
// START SERVER
///////////////////////////
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});