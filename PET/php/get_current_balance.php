<?php
session_start();
header("Content-Type: application/json");
require_once "config.php";

if(!isset($_SESSION['user_id'])){
    echo json_encode(["status"=>"error","message"=>"Not logged in"]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Optional: reset at new month (same as step 2) before returning balance
$stmt = $pdo->prepare("SELECT current_balance, balance_last_reset FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

$today = date("Y-m-d");
$firstDayOfMonth = date("Y-m-01");

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

echo json_encode([
    "status" => "success",
    "balance" => $user['current_balance']
]);
?>