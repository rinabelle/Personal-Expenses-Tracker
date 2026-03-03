<?php
session_start();
require_once "config.php";

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) exit;

// Fetch current balance and last reset date
$stmt = $pdo->prepare("SELECT current_balance, balance_last_reset FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

$today = date("Y-m-d");
$firstDayOfMonth = date("Y-m-01");

// Only reset if last reset < first day of this month
if ($user['balance_last_reset'] < $firstDayOfMonth) {

    // Fetch latest monthly income
    $incomeStmt = $pdo->prepare("
        SELECT salary, freelance, net_income
        FROM income
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
    ");
    $incomeStmt->execute([$user_id]);
    $income = $incomeStmt->fetch(PDO::FETCH_ASSOC);

    $monthly_income = $income ? ($income['salary'] + $income['freelance'] + $income['net_income']) : 0;

    // Reset current_balance
    $update = $pdo->prepare("UPDATE users SET current_balance = ?, balance_last_reset = ? WHERE id = ?");
    $update->execute([$monthly_income, $today, $user_id]);

    // Update monthly_balance table
    $stmt = $pdo->prepare("
        INSERT INTO monthly_balance (user_id, month, year, balance)
        VALUES (:uid, :month, :year, :balance)
        ON DUPLICATE KEY UPDATE balance = :balance
    ");

    $stmt->execute([
        'uid' => $user_id,
        'month' => date('n'),
        'year' => date('Y'),
        'balance' => $monthly_income
    ]);
}
?>