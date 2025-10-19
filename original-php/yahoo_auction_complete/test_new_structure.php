<?php
echo "<h1>new_structure PHP Test</h1>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Current Time: " . date('Y-m-d H:i:s') . "<br>";
echo "File Path: " . __FILE__ . "<br>";
echo "Directory: " . __DIR__ . "<br>";

echo "<h2>Available Files:</h2>";
$files = scandir(__DIR__);
foreach($files as $file) {
    if($file != '.' && $file != '..') {
        echo $file . "<br>";
    }
}
?>
