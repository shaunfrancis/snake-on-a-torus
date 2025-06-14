<?php
    $mysql_host = "*";
    $mysql_user = "*";
    $mysql_password = "*";
    $mysql_database = "*";

    $conn = new mysqli($mysql_host, $mysql_user, $mysql_password, $mysql_database);

    $id = $_REQUEST['id'];
    if(isset($id)){

        $stmt = $conn -> prepare("SELECT COUNT(*) + 1 FROM `snake_leaderboard` WHERE  `score` > (SELECT `score` FROM `snake_leaderboard` WHERE `amend_id` = ?)");

        $stmt -> bind_param("s", $id);
        
        $stmt -> execute();

        $stmt -> bind_result($position);

        while( $stmt -> fetch() ){
            echo $position;
        }

        $stmt -> close();

    }
    else echo '0';

?>