<?php
session_start();
header("Content-Type: application/json");

require_once "config.php"; // your PDO connection file

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "User not authenticated."
    ]);
    exit;
}

// Get raw JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (
    !isset($data['amount']) ||
    !isset($data['category']) ||
    empty($data['amount']) ||
    empty($data['category'])
) {
    echo json_encode([
        "status" => "error",
        "message" => "Required fields missing."
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];
$amount = floatval($data['amount']);
$category = trim($data['category']);
$description = isset($data['description']) ? trim($data['description']) : null;
$expense_date = isset($data['expense_date']) 
    ? $data['expense_date'] 
    : date("Y-m-d"); // fallback to current date

try {
    $pdo->beginTransaction();

    // Insert expense
    $sql = "INSERT INTO expenses 
            (user_id, category, amount, expense_date, description)
            VALUES (:user_id, :category, :amount, :expense_date, :description)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ":user_id" => $user_id,
        ":category" => $category,
        ":amount" => $amount,
        ":expense_date" => $expense_date,
        ":description" => $description
    ]);

    // Deduct expense from current_balance
    $updateBalance = $pdo->prepare("UPDATE users SET current_balance = current_balance - ? WHERE id = ?");
    $updateBalance->execute([$amount, $user_id]);

    // Update monthly_balance for the month of the expense
    $month = date('n', strtotime($expense_date));
    $year = date('Y', strtotime($expense_date));

    $stmt = $pdo->prepare("
        INSERT INTO monthly_balance (user_id, month, year, balance)
        VALUES (:uid, :month, :year, :balance)
        ON DUPLICATE KEY UPDATE balance = :balance
    ");

    // Get the latest current_balance after deduction
    $stmtBalance = $pdo->prepare("SELECT current_balance FROM users WHERE id = ?");
    $stmtBalance->execute([$user_id]);
    $currentBalance = (float)$stmtBalance->fetchColumn();

    $stmt->execute([
        'uid' => $user_id,
        'month' => $month,
        'year' => $year,
        'balance' => $currentBalance
    ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Expense saved successfully."
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode([
        "status" => "error",
        "message" => "Database error.",
        "error" => $e->getMessage()
    ]);
}
?>