<?php
    require 'db.php';
    
    function fetch($sql, $params = []){
        global $pdo;
        $stmt = $pdo -> prepare($sql);
        $success = $stmt -> execute($params);
        if($success){
            $results = $stmt -> fetchAll(PDO::FETCH_ASSOC);
            return $results;
        }
        else fail(400, "Bad request");
    }

    function fail($status, $error = ""){
        if(empty($error)) $error = match($status){
            400 => "Bad request",
            403 => "Forbidden",
            404 => "Not found",
            405 => "Method not allowed",
            500 => "Internal server error",
            default => "Unknown error"
        };
        
        http_response_code($status);
        exit( json_encode( array("success" => "false", "reason" => $error) ) );
    }
?>