$content = Get-Content index.html -Raw -Encoding UTF8

# Find exact section tags with regex
$sectionMatches = [regex]::Matches($content, '<section id="section-activities"')
Write-Host "Found $($sectionMatches.Count) exact section-activities tags"

# Count closing tags
$closeMatches = [regex]::Matches($content, '</section>')
Write-Host "Found $($closeMatches.Count) section closing tags"

# Find line numbers
$lines = $content.Split([Environment]::NewLine)
$lineNum = 0
Write-Host ""
foreach ($line in $lines) {
    $lineNum++
    if ($line.Contains('<section id="section-activities"')) {
        Write-Host ("Line " + $lineNum + ": opening section-activities tag")
    }
}
