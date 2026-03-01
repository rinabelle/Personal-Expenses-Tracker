<?php
$host = "localhost";
$dbname = "finance_db";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

$pdo->exec("SET time_zone = '+05:30'");
date_default_timezone_set('Asia/Kolkata');
?>