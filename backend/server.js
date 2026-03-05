// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "finance_db" // your database name
});

db.connect((err) => {
  if (err) console.log("Database connection failed:", err);
  else console.log("Connected to MySQL");
});

///////////////////////////
// SIGN-UP
///////////////////////////
app.post("/signup", async (req, res) => {
  try {
    const { display_name, email, password, current_balance } = req.body;

    if (!display_name || !email || !password || current_balance === undefined) {
      return res.json({ status: "error", message: "All fields are required." });
    }

    // Check if user exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.json({ status: "error", message: err.message });
      if (results.length > 0) return res.json({ status: "error", message: "Email already exists." });

      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      db.query(
        "INSERT INTO users (display_name, email, password) VALUES (?, ?, ?)",
        [display_name, email, hashedPassword],
        (err, result) => {
          if (err) return res.json({ status: "error", message: err.message });

          const user_id = result.insertId;
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();

          // Insert initial balance into monthly_balance
          db.query(
            "INSERT INTO monthly_balance (user_id, month, year, balance) VALUES (?, ?, ?, ?)",
            [user_id, month, year, parseFloat(current_balance)],
            (err2) => {
              if (err2) return res.json({ status: "error", message: err2.message });
              res.json({ status: "success", user_id, display_name });
            }
          );
        }
      );
    });
  } catch (error) {
    res.json({ status: "error", message: error.message });
  }
});

///////////////////////////
// LOGIN
///////////////////////////
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ status: "error", message: "Email and password required." });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.json({ status: "error", message: err.message });
    if (results.length === 0) return res.json({ status: "error", message: "User not found." });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.json({ status: "error", message: "Incorrect password." });

    res.json({ status: "success", user_id: user.id, display_name: user.display_name });
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
    const expires_at = new Date(Date.now() + 3600 * 1000); // 1 hour expiration

    db.query(
      "INSERT INTO password_reset (email, token, expires_at) VALUES (?, ?, ?)",
      [email, token, expires_at],
      (err2) => {
        if (err2) return res.json({ status: "error", message: err2.message });
        // You would normally send email here
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

///////////////////////////
// EXPENSES
///////////////////////////
app.post("/expenses", (req, res) => {
  const { user_id, category, amount, expense_date, description } = req.body;
  if (!user_id || !category || !amount || !expense_date) return res.json({ status: "error", message: "Required fields missing." });

  db.query(
    "INSERT INTO expenses (user_id, category, amount, expense_date, description) VALUES (?, ?, ?, ?, ?)",
    [user_id, category, amount, expense_date, description || ""],
    (err, result) => {
      if (err) return res.json({ status: "error", message: err.message });
      res.json({ status: "success", expense_id: result.insertId });
    }
  );
});

app.get("/expenses/:user_id", (req, res) => {
  const { user_id } = req.params;
  db.query("SELECT * FROM expenses WHERE user_id = ?", [user_id], (err, results) => {
    if (err) return res.json({ status: "error", message: err.message });
    res.json({ status: "success", data: results });
  });
});

app.get("/", (req, res) => {
  res.send("Server is running!"); // simple test message
});

///////////////////////////
// START SERVER
///////////////////////////
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});