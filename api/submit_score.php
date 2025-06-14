<?php
    header('Content-Type: application/json');

    if(! isset($_SESSION)) session_start();      
    require 'fetch.php';  

    $json = file_get_contents('php://input');
    if(!$json) failure("Missing body");
    $data = json_decode($json, true);
    if(!$data) failure("Invalid body");

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
            $success = fetch(
                "UPDATE snake_leaderboard SET user_id = ? WHERE amend_id = ?",
                [$_SESSION['user_id'], $data['id']]
            );
            $position = getPlacement($data['id']);
            echo '{"login_status":true, "success":true, "id":"' . $data['id'] . '", "position":' . $position . '}';
        }
        else echo '{"login_status":false, "id":"' . $data['id'] . '", "success":true}';
    }
    else{

        if(isset($_SESSION['user_id'],$_SESSION['user_name'])){
            $success = fetch(
                "INSERT INTO snake_leaderboard (user_id, score, duration, amend_id) VALUES (?,?,?,?)",
                [$_SESSION['user_id'], $score, $duration, $amend_id]
            );
            $position = getPlacement($amend_id);
            echo '{"login_status":true, "success":true, "id":"' . $amend_id . '", "position":' . $position . '}';
        }

        else{
            $success = fetch(
                "INSERT INTO snake_leaderboard (score, duration, amend_id) VALUES (?,?,?)",
                [$score, $duration, $amend_id]
            );
            echo '{"login_status":false, "id":"' . $amend_id . '", "success":true}';
        }
    }

    function failure($reason){
        if($reason) die('{"success":false, "reason":"' . $reason . '"}');
        else die('{"success":false}');
    }

    function getPlacement($placement_id){
        $positions = fetch(
            "SELECT COUNT(*) + 1 as position FROM snake_leaderboard WHERE  score > (SELECT score FROM snake_leaderboard WHERE amend_id = ?) AND user_id IS NOT NULL",
            [$placement_id]
        );

        if(count($positions) === 0) return false;
        else return $positions[0]['position'];
    }

?>