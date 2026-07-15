param(
    [ValidateSet("success", "failed")]
    [string]$Result = "success",

    [int]$DelaySeconds = 3,

    [string]$BaseUrl = "http://localhost:3000"
)

$envPath = Join-Path $PSScriptRoot "..\.env"
$secretLine = Get-Content $envPath | Where-Object { $_ -match "^GITLAB_WEBHOOK_SECRET=" }
$secret = $secretLine -replace "^GITLAB_WEBHOOK_SECRET=", ""

$stages = "created", "pending", "running", $Result

foreach ($stage in $stages) {
    $fixturePath = Join-Path $PSScriptRoot "fixtures\$stage.json"
    $body = Get-Content $fixturePath -Raw

    Write-Output "--> sending status: $stage"
    $response = Invoke-RestMethod -Uri "$BaseUrl/webhook/gitlab" -Method Post `
        -ContentType "application/json" `
        -Headers @{ "X-Gitlab-Token" = $secret } `
        -Body $body

    $response | ConvertTo-Json -Compress

    if ($stage -ne $stages[-1]) {
        Start-Sleep -Seconds $DelaySeconds
    }
}