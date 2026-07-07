$file = "index.html"
$content = Get-Content $file -Raw -Encoding UTF8

$dashboardStart = $content.IndexOf('<section id="section-activities-dashboard"')
$maintenanceStart = $content.IndexOf('<div id="maintenance-forms"')

if ($dashboardStart -gt 0 -and $maintenanceStart -gt $dashboardStart) {
    $sectionEnd = $content.IndexOf('</section>', $dashboardStart) + 10
    $beforeDash = $content.Substring(0, $sectionEnd)
    $afterDash = $content.Substring($maintenanceStart)
    
    $newContent = $beforeDash + [Environment]::NewLine + [Environment]::NewLine + " " + $afterDash
    
    $newContent | Set-Content $file -Encoding UTF8
    Write-Host "✅ Cleaned Incidencias - removed dashboard analytics"
} else {
    Write-Host "❌ Could not find section boundaries"
    Write-Host "dashboardStart=$dashboardStart maintenanceStart=$maintenanceStart"
}
