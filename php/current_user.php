<?php
session_start();
header("Content-Type: application/json");
include "config.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "logged_in" => false,
        "username" => "Guest"
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

// Check if user already added income
$stmt = $pdo->prepare("SELECT id FROM income WHERE user_id = :user_id LIMIT 1");
$stmt->execute([':user_id' => $user_id]);
$hasIncome = $stmt->fetch() ? true : false;

// Fetch user info (including balance)
$stmt2 = $pdo->prepare("SELECT display_name, current_balance FROM users WHERE id = :user_id");
$stmt2->execute([':user_id' => $user_id]);
$user = $stmt2->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "logged_in" => true,
    "username" => $user['display_name'],
    "balance" => $user['current_balance'],
    "id" => $user_id,
    "first_time" => !$hasIncome
]);
?>
