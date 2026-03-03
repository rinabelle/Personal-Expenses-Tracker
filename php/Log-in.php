<?php
session_start();
include "config.php";
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    try {
        $email = trim($_POST["email"] ?? '');
        $password_input = trim($_POST["password"] ?? '');

        if ($email === '' || $password_input === '') {
            echo json_encode(["status" => "error", "message" => "Email and password are required."]);
            exit();
        }

        // Get user by email
        $stmt = $pdo->prepare("SELECT id, display_name, password FROM users WHERE email = :email");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        
        if ($user) {

            // Verify hashed password
            if (password_verify($password_input, $user['password'])) {

                $_SESSION['user_id'] = $user['id'];
                $_SESSION['display_name'] = $user['display_name'];

                echo json_encode(["status" => "success"]);
                exit();

            } else {
                echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
                exit();
            }

        } else {
            echo json_encode(["status" => "error", "message" => "No user found with that email."]);
            exit();
        }

    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        exit();
    }
}
?>
