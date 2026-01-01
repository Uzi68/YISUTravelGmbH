param(
  [string]$Distro = ""
)

$projectPath = "/mnt/c/Users/uezey/Desktop/Personal Stuff/Programming/Web Development/Claude/YISUTravelFrontend"
$command = "cd '$projectPath' && npm run deploy"

if ($Distro -ne "") {
  wsl.exe -d $Distro -- bash -lc $command
} else {
  wsl.exe -- bash -lc $command
}
