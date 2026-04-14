# Run interaction tests in a separate process
param([string]$Flow = "")

$workDir = "c:\Users\Administrator\Desktop\mmomarket2"
$outFile = Join-Path $workDir "tools\output\test-output.txt"
$errFile = Join-Path $workDir "tools\output\test-errors.txt"

New-Item -ItemType Directory -Force -Path (Join-Path $workDir "tools\output") | Out-Null

if ($Flow) {
    $args = @("tools/interact.mjs", "--flow", $Flow)
} else {
    $args = @("tools/interact.mjs")
}

$proc = Start-Process -FilePath "node" -ArgumentList $args -WorkingDirectory $workDir -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile

Write-Host "=== STDOUT ==="
Get-Content $outFile
Write-Host ""
Write-Host "=== STDERR ==="
Get-Content $errFile
Write-Host ""
Write-Host "Exit code: $($proc.ExitCode)"
