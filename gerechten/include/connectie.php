<?php   
    $DATABASE_HOST = 'localhost';
    $DATABASE_USER = 'root';
    $DATABASE_PASS = '';
    $DATABASE_NAME = 'gerechten';
    try 
    {
        $connectie= new PDO("mysql:host=$DATABASE_HOST;dbname=$DATABASE_NAME",$DATABASE_USER, $DATABASE_PASS);
    } catch (PDOException $exception) 
    {
        
        exit('Fout, kan geen verbinding maken!');
    }
?>
