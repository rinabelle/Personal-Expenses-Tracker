<?php
require_once "config.php"; // PDO connection

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    exit("Invalid request.");
}

$email = trim($_POST["email"] ?? "");

if (empty($email)) {
    exit("Email is required.");
}

// Check if email exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
$stmt->execute(["email" => $email]);
$user = $stmt->fetch();

if ($user) {

    $token = bin2hex(random_bytes(32));
    $expires = date("Y-m-d H:i:s", strtotime("+1 hour"));

    // Delete old tokens
    $delete = $pdo->prepare("DELETE FROM password_resets WHERE email = :email");
    $delete->execute(["email" => $email]);

    // Insert new token
    $insert = $pdo->prepare("
        INSERT INTO password_resets (email, token, expires_at)
        VALUES (:email, :token, NOW() + INTERVAL 1 HOUR)
    ");
    $insert->execute([
        "email" => $email,
        "token" => $token
    ]);

    $resetLink = "http://localhost/PET/reset_password.php?token=" . $token;

    // Display clickable anchor
    echo "<p>Click the link below to reset your password:</p>";
    echo "<p><a href='$resetLink'>$resetLink</a></p>";

} else {
    // Security: don’t reveal if email exists
    echo "If the email exists, a reset link has been generated.";
}
?>