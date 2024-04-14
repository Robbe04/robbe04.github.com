<?php  
	include "include/connectie.php";

	$sql="SELECT `tblgerecht`.*
FROM `tblgerecht`
WHERE `tblgerecht`.`gerechtid` = :gerechtid;";

	$data=["gerechtid"=>$_GET['gerechtid']];

	$statement=$connectie->prepare($sql);

	$statement->execute($data);
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<!-- Link favicon -->
	<?php include "include/favicon.php" ?>

	<!-- Link opmaak -->
	<link rel="stylesheet" href="opmaak/opmaak.css">

	<!-- Bootstrap -->
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">

	<title>Gerechten - Uitleg</title>
</head>
<body>

<!-- Navbar -->
<?php include "include/navbar.php" ?>

<!-- Lus voor gerechten -->
<div class="container text-center">
	<div class="row">
		<div class="col">

<br>
<?php foreach ($statement as $gerecht)
{ ?>

			
<!-- Gerechttitel -->
<div class="mb-3 text-center" style="border: 2px solid black; margin-left: 4%; margin-right: 4%;">
	<h2 class="fw-bold"><em><?php echo $gerecht["gerecht"] ?></em></h2>
</div>

<!-- Gerechtfoto -->
<img class="gerechtfoto" src="<?php echo $gerecht["gerechtfoto"] ?>" width="350" heigh="350">

<!-- Gerechtingrediënten -->
<div class="text-start">
	<span class="text-center mt-2" style="border-bottom: 1px solid black;"><h3><em>Ingrediënten</em></h3></span>
	<?php echo $gerecht["gerechtingrediënten"] ?>
</div>

<?php } ?>

			</div>
		</div>
</div>	


<?php include "include/footer.php" ?>

<!-- Bootstrap -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>

</body>
</html>