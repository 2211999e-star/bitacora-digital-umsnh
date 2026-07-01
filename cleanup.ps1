# Read the file
$content = Get-Content index.html -Raw -Encoding UTF8

# Find the exact positions of the two sections
$first_section = $content.IndexOf('<section id="section-activities" class="section activities hidden">')
$activities_comment = $content.IndexOf('<!-- Activities Section -->')

if ($first_section -ge 0 -and $activities_comment -gt $first_section) {
    # We need to find where the first section closes (the </section> before Activities comment)
    $section_close = $content.LastIndexOf('</section>', $activities_comment - 1)
    
    if ($section_close -gt 0) {
        # Extract everything before the first section and everything from the comment onwards
        $before = $content.Substring(0, $first_section)
        $after = $content.Substring($activities_comment)
        
        # Combine: remove everything between before and comment
        $newContent = $before + $after
        
        # Write back
        $newContent | Set-Content index.html -Encoding UTF8
        Write-Host "✅ Removed ~204 lines of dashboard analytics from Incidencias"
    }
} else {
    Write-Host "❌ Could not find section boundaries"
    Write-Host "first_section=$first_section activities_comment=$activities_comment"
}
