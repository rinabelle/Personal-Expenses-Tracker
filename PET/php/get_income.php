<?php
session_start();
header("Content-Type: application/json");
include "config.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit;
}

$user_id = $_SESSION['user_id'];

try {

    $stmt = $pdo->prepare("
        SELECT salary, freelance, net_income
        FROM income
        WHERE user_id = :user_id
        ORDER BY id DESC
        LIMIT 1
    ");

    $stmt->execute([
        ':user_id' => $user_id
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {

        $monthly_income =
            $row['salary'] +
            $row['freelance'] +
            $row['net_income'];

        echo json_encode([
            "status" => "success",
            "salary" => $row['salary'],
            "freelance" => $row['freelance'],
            "net_income" => $row['net_income'],
            "monthly_income" => $monthly_income
        ]);

    } else {
        echo json_encode(["status" => "empty"]);
    }

} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
