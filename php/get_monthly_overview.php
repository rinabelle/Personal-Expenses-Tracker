<?php
session_start();
header("Content-Type: application/json");

require_once "config.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Not logged in"
    ]);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    // GET LATEST MONTHLY INCOME
    $stmtIncome = $pdo->prepare("
        SELECT salary, freelance, net_income
        FROM income
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmtIncome->execute([$user_id]);
    $income = $stmtIncome->fetch(PDO::FETCH_ASSOC);

    $monthlyIncome = 0;

    if ($income) {
        $monthlyIncome =
            floatval($income['salary']) +
            floatval($income['freelance']) +
            floatval($income['net_income']);
    }

    // GET EXPENSES GROUPED BY MONTH (CURRENT YEAR)
    $stmtExpenses = $pdo->prepare("
        SELECT MONTH(expense_date) AS month,
               SUM(amount) AS total_expenses
        FROM expenses
        WHERE user_id = ?
          AND YEAR(expense_date) = YEAR(CURDATE())
        GROUP BY MONTH(expense_date)
    ");
    $stmtExpenses->execute([$user_id]);

    // Initialize all 12 months with 0
    $expensesByMonth = array_fill(1, 12, 0);

    while ($row = $stmtExpenses->fetch(PDO::FETCH_ASSOC)) {
        $month = intval($row['month']); // 1-12
        $expensesByMonth[$month] = floatval($row['total_expenses']);
    }

    // BUILD FINAL DATA ARRAY

    // Get user creation month and current balance
    $stmtUser = $pdo->prepare("
        SELECT current_balance, created_at
        FROM users
        WHERE id = ?
    ");
    $stmtUser->execute([$user_id]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    $currentBalance = floatval($user['current_balance']);
    $createdMonth = date("n", strtotime($user['created_at']));
    $currentMonth = date("n");

    $monthlyData = [];
    $cumulativeExpenses = 0;

    for ($m = 1; $m <= 12; $m++) {

        $monthlyExpenses = $expensesByMonth[$m];
        $cumulativeExpenses += $monthlyExpenses;

        $savings = 0;

        // If month is before user existed -> 0
        if ($m < $createdMonth) {
            $savings = 0;
        }
        // If month is current month -> use actual current balance
        elseif ($m == $currentMonth) {
            $savings = $currentBalance;
        }
        // If month is past month after account creation
        elseif ($m < $currentMonth) {
            $incomeSoFar = $monthlyIncome * ($m - $createdMonth + 1);
            $savings = max($incomeSoFar - $cumulativeExpenses, 0);
        }
        // Future months -> 0
        else {
            $savings = 0;
        }

        $monthlyData[] = [
            "expenses" => $monthlyExpenses,
            "savings"  => $savings
        ];
    }

    echo json_encode([
        "status" => "success",
        "data"   => $monthlyData
    ]);

} catch (Exception $e) {

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
