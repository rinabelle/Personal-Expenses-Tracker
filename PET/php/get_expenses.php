<?php
header('Content-Type: application/json');
session_start();
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status"=>"error","message"=>"User not logged in"]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get user info
$userStmt = $pdo->prepare("SELECT current_balance, balance_last_reset FROM users WHERE id = ?");
$userStmt->execute([$user_id]);
$user = $userStmt->fetch(PDO::FETCH_ASSOC);

// Reset balance if needed (first day of month)
$today = date('Y-m-d');
$firstDayOfMonth = date('Y-m-01');

if ($user['balance_last_reset'] < $firstDayOfMonth) {
    // Get latest monthly income
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

    // Reset balance
    $update = $pdo->prepare("UPDATE users SET current_balance = ?, balance_last_reset = ? WHERE id = ?");
    $update->execute([$monthly_income, $today, $user_id]);

    $user['current_balance'] = $monthly_income;
}

// Fetch expenses
$stmt = $pdo->prepare("SELECT id, expense_date, category, amount, description FROM expenses WHERE user_id = ?");
$stmt->execute([$user_id]);
$expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "status" => "success",
    "current_balance" => $user['current_balance'],
    "expenses" => $expenses
]);
