<?php
    if(! isset($_SESSION)) session_start();    

    if(isset($_SESSION['user_id'],$_SESSION['user_name'])){
        echo json_encode([
            'status' => 1,
            'user' => $_SESSION['user_name'],
            'subscription_active' => $_SESSION['user_subscription_active']
        ]);
    }
    else{
        echo json_encode(['status' => 0]);
    }