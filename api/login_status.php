<?php
    if(! isset($_SESSION)) session_start();    

    if(isset($_SESSION['user_id'],$_SESSION['user_name'])){
        echo '{"status":1, "user":"' . $_SESSION['user_name'] . '"}';
    }
    else{
        echo '{"status":0}';
    }
?>