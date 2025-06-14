<?php
    if(! isset($_SESSION)) session_start();
    require 'fetch.php';

    $since = match($_REQUEST['since'] ?? 'all-time') {
        'year' => 365,
        'month' => 31,
        'week' => 7,
        default => NULL
    };
    
    if(!empty($since)){
        $sinceCondition = "snake_leaderboard.time >= DATE(NOW() - INTERVAL {$since} DAY)";
    }

    $top_scores = fetch(
        sprintf(
            "SELECT tennessine_users.username, snake_leaderboard.score, snake_leaderboard.user_id 
            FROM snake_leaderboard
            INNER JOIN tennessine_users ON tennessine_users.id = snake_leaderboard.user_id 
            %s
            ORDER BY snake_leaderboard.score DESC, snake_leaderboard.time DESC LIMIT 10",
            !empty($sinceCondition) ? 'WHERE ' . $sinceCondition : ''
        )
    );

    foreach($top_scores as $score){
        if(isset($_SESSION['user_id']) && $_SESSION['user_id'] == $score['user_id']){
            $scores[] = array('score' => $score['score'], 'username' => $score['username'], 'you' => true);
        }
        else $scores[] = array('score' => $score['score'], 'username' => $score['username']);  
    }
    
    if(isset($_SESSION['user_id'])){
        $users_best_score = fetch(
            sprintf(
                "SELECT tennessine_users.username, snake_leaderboard.score, snake_leaderboard.amend_id as id 
                FROM snake_leaderboard 
                INNER JOIN tennessine_users ON tennessine_users.id = snake_leaderboard.user_id 
                WHERE snake_leaderboard.user_id = ? %s
                ORDER BY snake_leaderboard.score DESC LIMIT 1",
                !empty($sinceCondition) ? 'AND ' . $sinceCondition : ''
            ),
            [$_SESSION['user_id']]
        );

        if(count($users_best_score) !== 0){
            $best = $users_best_score[0];
            $position = getBestPlacement($_SESSION['user_id']);
            if($position){
                $scores[] = array('score'=>$best['score'], 'username'=>$best['username'], 'position'=>$position, 'you'=>true);
            }
        }
    }

    echo json_encode($scores);

    function getBestPlacement($id){
        global $sinceCondition;

        $placement = fetch(
            sprintf(
                "SELECT COUNT(*) + 1 as position FROM snake_leaderboard 
                WHERE  score > (
                    SELECT score FROM snake_leaderboard WHERE user_id = ? ORDER BY score DESC LIMIT 1
                ) AND user_id IS NOT NULL %s",
                !empty($sinceCondition) ? 'AND ' . $sinceCondition : ''
            ),
            [$id]
        );

        return $placement[0]['position'];
    }

?>