<?php
session_start();
header('Content-Type: application/json');
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status"=>"error","message"=>"User not logged in"]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Get IDs from request
$data = json_decode(file_get_contents("php://input"), true);
$ids = $data['ids'] ?? [];

if (empty($ids)) {
    echo json_encode(["status"=>"error","message"=>"No expense IDs provided"]);
    exit;
}

// Build placeholders for prepared statement
$placeholders = implode(',', array_fill(0, count($ids), '?'));

// Calculate total amount of expenses to restore balance
$stmt = $pdo->prepare("
    SELECT SUM(amount) as total 
    FROM expenses 
    WHERE user_id = ? AND id IN ($placeholders)
");
$stmt->execute(array_merge([$user_id], $ids));
$totalRemoved = $stmt->fetchColumn();

if (!$totalRemoved) {
    $totalRemoved = 0;
}

// Delete the expenses
$delStmt = $pdo->prepare("
    DELETE FROM expenses 
    WHERE user_id = ? AND id IN ($placeholders)
");
$delStmt->execute(array_merge([$user_id], $ids));

// Restore balance
$pdo->prepare("
    UPDATE users 
    SET current_balance = current_balance + ? 
    WHERE id = ?
")->execute([$totalRemoved, $user_id]);

// Get UPDATED balance
$stmt = $pdo->prepare("SELECT current_balance FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$newCurrentBalance = $stmt->fetchColumn();

// Save into monthly_balance (current month snapshot)
$stmt = $pdo->prepare("
    INSERT INTO monthly_balance (user_id, month, year, balance)
    VALUES (:uid, :month, :year, :balance)
    ON DUPLICATE KEY UPDATE balance = :balance
");

$stmt->execute([
    'uid' => $user_id,
    'month' => date('n'),
    'year' => date('Y'),
    'balance' => $newCurrentBalance
]);

echo json_encode([
    "status" => "success",
    "restored" => $totalRemoved
]);
?>