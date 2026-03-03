<?php
session_start();
header("Content-Type: application/json");
include "config.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['salary'], $data['freelance'], $data['net_income'])) {
    echo json_encode(["status" => "error", "message" => "Missing fields"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$salary = floatval($data['salary']);
$freelance = floatval($data['freelance']);
$net_income = floatval($data['net_income']);
$income_date = date("Y-m-d"); 

try {
    $pdo->beginTransaction();

    // Insert income record
    $stmt = $pdo->prepare("
        INSERT INTO income (user_id, salary, freelance, net_income, income_date)
        VALUES (:user_id, :salary, :freelance, :net_income, :income_date)
    ");
    $stmt->execute([
        ':user_id' => $user_id,
        ':salary' => $salary,
        ':freelance' => $freelance,
        ':net_income' => $net_income,
        ':income_date' => $income_date
    ]);

    // Update monthly_balance table
    $month = date('n', strtotime($income_date));
    $year = date('Y', strtotime($income_date));

    $stmtBalance = $pdo->prepare("SELECT current_balance FROM users WHERE id = ?");
    $stmtBalance->execute([$user_id]);
    $currentBalance = (float)$stmtBalance->fetchColumn();

    $stmtMonth = $pdo->prepare("
        INSERT INTO monthly_balance (user_id, month, year, balance)
        VALUES (:uid, :month, :year, :balance)
        ON DUPLICATE KEY UPDATE balance = :balance
    ");
    $stmtMonth->execute([
        'uid' => $user_id,
        'month' => $month,
        'year' => $year,
        'balance' => $currentBalance
    ]);

    $pdo->commit();

    echo json_encode(["status" => "success"]);

} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>