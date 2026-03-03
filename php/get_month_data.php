<?php
header('Content-Type: application/json');
require 'config.php'; // $pdo

try {
    session_start();
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status'=>'error','message'=>'User not logged in']);
        exit;
    }
    $userId = $_SESSION['user_id'];

    $validMonths = [
        'vjan'=>1,'vfeb'=>2,'vmar'=>3,'vapr'=>4,
        'vmay'=>5,'vjune'=>6,'vjuly'=>7,'vaug'=>8,
        'vsep'=>9,'voct'=>10,'vnov'=>11,'vdec'=>12
    ];

    if (!isset($_GET['month']) || !array_key_exists($_GET['month'], $validMonths)) {
        echo json_encode(['status'=>'error','message'=>'Invalid month']);
        exit;
    }

    $monthNum = $validMonths[$_GET['month']];
    $year = date('Y');

    // --- Income ---
    $stmt = $pdo->prepare("
        SELECT salary, freelance, net_income 
        FROM income 
        WHERE user_id=:uid AND MONTH(income_date)=:month AND YEAR(income_date)=:year
        ORDER BY income_date DESC LIMIT 1
    ");
    $stmt->execute(['uid'=>$userId,'month'=>$monthNum,'year'=>$year]);
    $income = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$income) $income=['salary'=>0,'freelance'=>0,'net_income'=>0];

    $totalIncome = $income['salary'] + $income['freelance'] + $income['net_income'];

    // --- Expenses ---
    $stmt = $pdo->prepare("
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE user_id=:uid AND MONTH(expense_date)=:month AND YEAR(expense_date)=:year
        GROUP BY category
    ");
    $stmt->execute(['uid'=>$userId,'month'=>$monthNum,'year'=>$year]);
    $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $expenseTotals = [
        'Rent'=>0,'Food'=>0,'Transport'=>0,'Shopping'=>0,'Bills'=>0,'Entertainment'=>0
    ];
    foreach($expenses as $e){
        if(isset($expenseTotals[$e['category']])) $expenseTotals[$e['category']] = (float)$e['total'];
    }

    // --- Get REAL current balance from users table ---
    $stmt = $pdo->prepare("
        SELECT balance
        FROM monthly_balance
        WHERE user_id = :uid
        AND month = :month
        AND year = :year
    ");
    $stmt->execute([
        'uid'=>$userId,
        'month'=>$monthNum,
        'year'=>$year
    ]);

    $balanceRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $currentBalance = $balanceRow ? (float)$balanceRow['balance'] : 0;

    // --- Monthly overview for bar chart ---
    $monthlyOverview = [['expenses'=>array_sum($expenseTotals),'savings'=>$currentBalance]];

    echo json_encode([
        'status'=>'success',
        'income'=>$income,
        'balance'=>$currentBalance,
        'expenseTotals'=>$expenseTotals,
        'monthlyOverview'=>$monthlyOverview
    ]);

} catch(PDOException $e){
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
?>