<?php
require_once "config.php";

$token = $_GET["token"] ?? "";

if (empty($token)) {
    exit("Invalid token.");
}

// Check if token exists and not expired
$stmt = $pdo->prepare("
    SELECT email FROM password_resets
    WHERE token = :token AND expires_at > NOW()
");
$stmt->execute(["token" => $token]);
$reset = $stmt->fetch();

if (!$reset) {
    exit("Token expired or invalid.");
}

$email = $reset["email"];
$message = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $newPassword = password_hash($_POST["password"], PASSWORD_DEFAULT);

    // Update the user's password
    $update = $pdo->prepare("UPDATE users SET password = :password WHERE email = :email");
    $update->execute([
        "password" => $newPassword,
        "email" => $email
    ]);

    // Delete the token
    $delete = $pdo->prepare("DELETE FROM password_resets WHERE email = :email");
    $delete->execute(["email" => $email]);

    $message = "Password successfully reset! Redirecting to login...";
}
?>

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Password | Peso Tracker</title>
    <link rel="stylesheet" href="Forgot-password.css" />
    <link rel="icon" type="image/png" href="images/Logo.png" />
</head>
<body>
    <main class="container">
        <section class="box">
            <h2>Reset Password</h2>
            <?php if ($message): ?>
                <p id="successMessage" style="color: green; font-weight: bold;"><?php echo $message; ?></p>
            <?php else: ?>
                <p>Enter your new password below.</p>
                <form class="Form" method="POST">
                    <label for="password">New Password</label>
                    <input type="password" name="password" id="password" placeholder="Enter new password" required />
                    <button type="submit" class="btn-submit">Reset Password</button>
                </form>
            <?php endif; ?>
        </section>
    </main>

    <div class="page-transition"></div>
    <div class="page-transition-solid"></div>

    <script>
        document.addEventListener("DOMContentLoaded", () => {
            const successMessage = document.getElementById("successMessage");
            if (!successMessage && document.querySelector(".container")) {
                const body = document.body;
                body.classList.add("show");

                const overlay = document.createElement("div");
                overlay.style.position = "fixed";
                overlay.style.top = "0";
                overlay.style.left = "0";
                overlay.style.width = "100%";
                overlay.style.height = "100vh";
                overlay.style.background =
                 "linear-gradient(to bottom, white 0%, white 90%, transparent 100%)";
                overlay.style.zIndex = "1000";
                overlay.style.pointerEvents = "none";
                overlay.style.transition = "transform 1s ease";
                overlay.style.transform = "translateY(0)";
                document.body.appendChild(overlay);

                setTimeout(() => {
                    overlay.style.transform = "translateY(-100%)";
                    setTimeout(() => {
                        overlay.remove();
                    }, 1000);
                }, 50);
            }

            // Automatically trigger page-transition after successful password reset
            if (successMessage) {
                setTimeout(() => {
                    const overlay = document.querySelector(".page-transition");
                    const solidOverlay = document.querySelector(".page-transition-solid");

                    if (overlay && solidOverlay) {
                        overlay.classList.add("active");

                        setTimeout(() => {
                            solidOverlay.classList.add("active");
                        }, 600);

                        setTimeout(() => {
                            window.location.href = 'Log-in.html';
                        }, 1200);
                    } else {
                        window.location.href = 'Log-in.html';
                    }
                }, 1000);
            }
        });
        </script>
</body>
</html>