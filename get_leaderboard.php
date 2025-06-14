<?php
    if(! isset($_SESSION)) session_start();

    $mysql_host = "*";
    $mysql_user = "*";
    $mysql_password = "*";
    $mysql_database = "*";

    $conn = new mysqli($mysql_host, $mysql_user, $mysql_password, $mysql_database);

    $stmt = $conn -> prepare("SELECT `tennessine_users`.username, `snake_leaderboard`.score, `snake_leaderboard`.user_id FROM `snake_leaderboard` INNER JOIN `tennessine_users` ON `tennessine_users`.id = `snake_leaderboard`.user_id ORDER BY `snake_leaderboard`.score DESC, `snake_leaderboard`.time DESC LIMIT 10");
    
    $stmt -> execute();
    $stmt -> bind_result($username,$score,$user_id);

    while( $stmt -> fetch() ){
        if(isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user_id) $scores[] = array('score'=>$score, 'username'=>$username, 'you'=>true);
        else $scores[] = array('score'=>$score, 'username'=>$username);  
    }

    $stmt -> close();

    if(isset($_SESSION['user_id'])){
        $personalStmt = $conn -> prepare("SELECT `tennessine_users`.username, `snake_leaderboard`.score, `snake_leaderboard`.amend_id FROM `snake_leaderboard` INNER JOIN `tennessine_users` ON `tennessine_users`.id = `snake_leaderboard`.user_id WHERE `snake_leaderboard`.user_id = ? ORDER BY `snake_leaderboard`.score DESC LIMIT 1");
        
        $personalStmt -> bind_param("s", $_SESSION['user_id']);
        $personalStmt -> execute();
        $personalStmt -> bind_result($username,$score,$id);

        while( $personalStmt -> fetch() ){
            $best_id = $id;
            $best_score = $score;
            $best_username = $username;
        }

        if($best_id){
            $position = getPlacement($conn, $_SESSION['user_id']);
            if($position){
                $scores[] = array('score'=>$best_score, 'username'=>$username, 'position'=>$position, 'you'=>true);
            }
        }
    }

    $conn -> close();

    echo json_encode($scores);

    function getPlacement($conn, $id){
        $stmt = $conn -> prepare("SELECT COUNT(*) + 1 FROM `snake_leaderboard` WHERE  `score` > (SELECT `score` FROM `snake_leaderboard` WHERE `user_id` = ? ORDER BY `score` DESC LIMIT 1) AND `user_id` IS NOT NULL");

        $stmt -> bind_param("s", $id);
        
        $stmt -> execute();

        $stmt -> bind_result($position);

        while($stmt -> fetch()){ //can't work this out
            $pos = $position;
        }

        if($pos) return $pos;
        else return "false";

        $stmt -> close();
    }

?>