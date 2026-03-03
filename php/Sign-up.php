<?php
session_start();
include "config.php";
header("Content-Type: application/json");
ini_set('display_errors', 1);
error_reporting(E_ALL);

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    try {
        $display_name = trim($_POST["display_name"] ?? '');
        $email = trim($_POST["email"] ?? '');
        $password_raw = trim($_POST["password"] ?? '');
        $balance_raw = trim($_POST["current_balance"] ?? '');

        if ($display_name === '' || $email === '' || $password_raw === '' || $balance_raw === '') {
            echo json_encode(["status" => "error", "message" => "All fields are required."]);
            exit();
        }

        $balance = floatval($balance_raw);
        $password = password_hash($password_raw, PASSWORD_DEFAULT);

        $pdo->beginTransaction();

        // Insert into users
        $stmt = $pdo->prepare(
            "INSERT INTO users (display_name, email, password, current_balance) 
             VALUES (:display_name, :email, :password, :balance)"
        );
        $stmt->execute([
            ':display_name' => $display_name,
            ':email' => $email,
            ':password' => $password,
            ':balance' => $balance
        ]);

        $user_id = $pdo->lastInsertId();

        // Insert into monthly_balance for the current month
        $month = date('n');
        $year = date('Y');

        $stmtMonth = $pdo->prepare("
            INSERT INTO monthly_balance (user_id, month, year, balance)
            VALUES (:uid, :month, :year, :balance)
            ON DUPLICATE KEY UPDATE balance = :balance
        ");
        $stmtMonth->execute([
            'uid' => $user_id,
            'month' => $month,
            'year' => $year,
            'balance' => $balance
        ]);

        $pdo->commit();

        $_SESSION['user_id'] = $user_id;
        $_SESSION['display_name'] = $display_name;

        echo json_encode(["status" => "success"]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}
?>