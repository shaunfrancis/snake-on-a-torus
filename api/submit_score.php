<?php
    header('Content-Type: application/json');

    if(! isset($_SESSION)) session_start();        

    $json = file_get_contents('php://input');
    if(!$json) failure("Missing body");
    $data = json_decode($json, true);
    if(!$data) failure("Invalid body");
    
    $mysql_host = "*";
    $mysql_user = "*";
    $mysql_password = "*";
    $mysql_database = "*";

    $conn = new mysqli($mysql_host, $mysql_user, $mysql_password, $mysql_database);

    if(!isset($data['score']) || !isset($data['duration']) || !isset($data['path'])) failure("Missing data");
    
    $amend_id = substr(md5(uniqid(rand())),0,15);
    $score = intval($data['score']);
    $duration = intval($data['duration']);

    $game_check = $data['path'];
    $valid_base64 = base64_decode($game_check);
    if(!$valid_base64) failure("Invalid path");

    $apples = explode(";", $valid_base64);
    $implicit_score = (count($apples) - 1) * 100;
    if($implicit_score != $score) failure("Incorrect path");

    if(isset($data['id'])){
        if(isset($_SESSION['user_id'],$_SESSION['user_name'])){
            $stmt = $conn -> prepare("UPDATE `snake_leaderboard` SET `user_id` = ? WHERE `amend_id` = ?");
            $stmt -> bind_param("ss", $_SESSION['user_id'], $data['id']);
            $result = $stmt -> execute();
            if(!$result) failure("Insertion failure");

            $stmt -> close();

            $position = getPlacement($conn, $data['id']);

            echo '{"login_status":true, "success":true, "id":"' . $data['id'] . '", "position":' . $position . '}';
        }
        else echo '{"login_status":false, "id":"' . $data['id'] . '", "success":true}';
    }
    else{

        if(isset($_SESSION['user_id'],$_SESSION['user_name'])){
            
            $stmt = $conn -> prepare("INSERT INTO `snake_leaderboard` (user_id, score, duration, amend_id) VALUES (?,?,?,?)");
            $stmt -> bind_param("siis", $_SESSION['user_id'], $score, $duration, $amend_id);
            $result = $stmt -> execute();
            if(!$result) failure("Insertion failure");
            
            $stmt -> close();

            $position = getPlacement($conn, $amend_id);

            echo '{"login_status":true, "success":true, "id":"' . $amend_id . '", "position":' . $position . '}';
        
        }

        else{
            
            $stmt = $conn -> prepare("INSERT INTO `snake_leaderboard` (user_id, score, duration, amend_id) VALUES (?,?,?,?)");
            $stmt -> bind_param("siis", $_SESSION['user_id'], $score, $duration, $amend_id);
            $result = $stmt -> execute();
            if(!$result) faulure("Insertion failure"); 
            
            $stmt -> close();

            echo '{"login_status":false, "id":"' . $amend_id . '", "success":true}';

        }
    }

    $conn -> close();

    function failure($reason){
        if($reason) die('{"success":false, "reason":"' . $reason . '"}');
        else die('{"success":false}');
    }

    function getPlacement($conn, $placement_id){
        $stmt = $conn -> prepare("SELECT COUNT(*) + 1 FROM `snake_leaderboard` WHERE  `score` > (SELECT `score` FROM `snake_leaderboard` WHERE `amend_id` = ?) AND `user_id` IS NOT NULL");

        $stmt -> bind_param("s", $placement_id);
        
        $stmt -> execute();

        $stmt -> bind_result($position);

        while($stmt -> fetch()){
            $pos = $position;
        }

        if($pos) return $pos;
        else return "false";

        $stmt -> close();
    }

?>