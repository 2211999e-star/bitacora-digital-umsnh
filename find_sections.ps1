$content = Get-Content index.html -Raw -Encoding UTF8
$lines = $content.Split([Environment]::NewLine)

Write-Host "Total lines: $($lines.Count)"
Write-Host ""

$dashboardCount = 0
$maintenanceCount = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line.Contains("section-activities")) {
        $dashboardCount++
        Write-Host "[$($dashboardCount)] Line $($i+1): section-activities"
    }
    if ($line.Contains("maintenance-forms")) {
        $maintenanceCount++
        Write-Host "[$($maintenanceCount)] Line $($i+1): maintenance-forms"
    }
}
