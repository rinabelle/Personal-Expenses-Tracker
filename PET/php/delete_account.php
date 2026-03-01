<?php
session_start();
require_once "config.php";

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid request method."
    ]);
    exit;
}

// Get JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['password'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Password is required."
    ]);
    exit;
}

$input_password = $data['password'];

// Check session
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "User not logged in."
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // Get stored password hash
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = :user_id");
    $stmt->execute(["user_id" => $user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            "status" => "error",
            "message" => "User not found."
        ]);
        exit;
    }

    // Verify password
    if (!password_verify($input_password, $user['password'])) {
        echo json_encode([
            "status" => "error",
            "message" => "Incorrect password."
        ]);
        exit;
    }

    // Start transaction
    $pdo->beginTransaction();

    // Delete related records
    $pdo->prepare("DELETE FROM expenses WHERE user_id = :user_id")
        ->execute(["user_id" => $user_id]);

    $pdo->prepare("DELETE FROM income WHERE user_id = :user_id")
        ->execute(["user_id" => $user_id]);

    $pdo->prepare("DELETE FROM monthly_balance WHERE user_id = :user_id")
        ->execute(["user_id" => $user_id]);

    // Delete user
    $pdo->prepare("DELETE FROM users WHERE id = :user_id")
        ->execute(["user_id" => $user_id]);

    $pdo->commit();

    session_destroy();

    echo json_encode([
        "status" => "success"
    ]);

} catch (PDOException $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        "status" => "error",
        "message" => "Failed to delete account."
    ]);
}
?>