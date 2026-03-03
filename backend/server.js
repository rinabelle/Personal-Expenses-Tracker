const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
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
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

///////////////////////////
// SIGNUP ROUTE
///////////////////////////
app.post("/signup", async (req, res) => {
  try {
    const { display_name, email, password, current_balance } = req.body;

    if (!display_name || !email || !password || !current_balance) {
      return res.json({ status: "error", message: "All fields are required." });
    }

    const balance = parseFloat(current_balance);
    const hashedPassword = await bcrypt.hash(password, 10);

    db.beginTransaction((err) => {
      if (err) throw err;

      // Insert into users table
      db.query(
        "INSERT INTO users (display_name, email, password, current_balance, created_at) VALUES (?, ?, ?, ?, NOW())",
        [display_name, email, hashedPassword, balance],
        (err, result) => {
          if (err) {
            return db.rollback(() => {
              res.json({ status: "error", message: err.message });
            });
          }

          const user_id = result.insertId;

          // Insert into monthly_balance for current month
          const month = new Date().getMonth() + 1;
          const year = new Date().getFullYear();

          db.query(
            `INSERT INTO monthly_balance (user_id, month, year, balance)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE balance = ?`,
            [user_id, month, year, balance, balance],
            (err2) => {
              if (err2) {
                return db.rollback(() => {
                  res.json({ status: "error", message: err2.message });
                });
              }

              db.commit((err3) => {
                if (err3) {
                  return db.rollback(() => {
                    res.json({ status: "error", message: err3.message });
                  });
                }

                res.json({ status: "success", user_id, display_name });
              });
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
// LOGIN ROUTE
///////////////////////////
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ status: "error", message: "Email and password required" });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.json({ status: "error", message: err.message });
      if (results.length === 0)
        return res.json({ status: "error", message: "User not found" });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.json({ status: "error", message: "Incorrect password" });
      }

      res.json({ status: "success", user_id: user.id, display_name: user.display_name });
    }
  );
});

///////////////////////////
// ADD INCOME
///////////////////////////
app.post("/income", (req, res) => {
  const { user_id, salary, freelance, net_income, income_date } = req.body;

  if (!user_id || net_income === undefined || !income_date) {
    return res.json({ status: "error", message: "Required fields missing" });
  }

  db.query(
    "INSERT INTO income (user_id, salary, freelance, net_income, income_date) VALUES (?, ?, ?, ?, ?)",
    [user_id, salary || 0, freelance || 0, net_income, income_date],
    (err, result) => {
      if (err) return res.json({ status: "error", message: err.message });
      res.json({ status: "success", income_id: result.insertId });
    }
  );
});

// GET INCOME
app.get("/income/:user_id", (req, res) => {
  const { user_id } = req.params;
  db.query("SELECT * FROM income WHERE user_id = ?", [user_id], (err, results) => {
    if (err) return res.json({ status: "error", message: err.message });
    res.json({ status: "success", data: results });
  });
});

///////////////////////////
// ADD EXPENSE
///////////////////////////
app.post("/expenses", (req, res) => {
  const { user_id, category, amount, expense_date, description } = req.body;

  if (!user_id || !category || !amount || !expense_date) {
    return res.json({ status: "error", message: "Required fields missing" });
  }

  db.query(
    "INSERT INTO expenses (user_id, category, amount, expense_date, description) VALUES (?, ?, ?, ?, ?)",
    [user_id, category, amount, expense_date, description || ""],
    (err, result) => {
      if (err) return res.json({ status: "error", message: err.message });
      res.json({ status: "success", expense_id: result.insertId });
    }
  );
});

// GET EXPENSES
app.get("/expenses/:user_id", (req, res) => {
  const { user_id } = req.params;
  db.query(
    "SELECT * FROM expenses WHERE user_id = ?",
    [user_id],
    (err, results) => {
      if (err) return res.json({ status: "error", message: err.message });
      res.json({ status: "success", data: results });
    }
  );
});

///////////////////////////
// START SERVER
///////////////////////////
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});