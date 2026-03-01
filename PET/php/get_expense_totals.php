<?php
session_start();
header("Content-Type: application/json");

require_once "config.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "User not authenticated"
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $sql = "SELECT category, SUM(amount) as total
            FROM expenses
            WHERE user_id = :user_id
            GROUP BY category";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([":user_id" => $user_id]);

    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert to associative array
    $totals = [];
    foreach ($results as $row) {
        $totals[$row['category']] = $row['total'];
    }

    echo json_encode([
        "status" => "success",
        "data" => $totals
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Database error"
    ]);
}
?>