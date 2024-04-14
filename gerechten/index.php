<?php  
	include "include/connectie.php";

	$sql="SELECT * FROM `tblgerecht`";

	$statement=$connectie->prepare($sql);

	$statement->execute();
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

	<title>Gerechten - Home</title>
</head>
<body>

<!-- Navbar -->
<?php include "include/navbar.php" ?>

<!-- Titel -->
<div class="mt-4 text-center" style="border: 2px solid black; margin-left: 4%; margin-right: 4%;">
	<em><h1>Restaurant Magerman</h1></em>
</div>


<!-- Lus voor gerechten -->
<div class="container mt-3">
	<div class="row">
		<div class="col-lg-4 mb-3 d-flex align-items-stretch">

<br>
<?php foreach ($statement as $gerecht)
{ ?>

	<a href="gerechtuitleg.php?gerechtid=<?php echo $gerecht["gerechtid"]?>">

	<div class="card me-5" style="width:21rem;">
  		<img class="gerechtfoto" src="<?php echo $gerecht["gerechtfoto"] ?>" width="350" heigh="350" class="card-img-top">
	</div>

	</a>

<?php } ?>

		</div>
	</div>
</div>		


<?php include "include/footer.php" ?>

<!-- Bootstrap -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>

</body>
</html>