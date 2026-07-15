param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("pending", "running", "success", "failed", "canceled")]
    [string]$Status,

    [string]$BaseUrl = "http://localhost:3000"
)

$envPath = Join-Path $PSScriptRoot "..\.env"
$secretLine = Get-Content $envPath | Where-Object { $_ -match "^GITLAB_WEBHOOK_SECRET=" }
$secret = $secretLine -replace "^GITLAB_WEBHOOK_SECRET=", ""

$fixturePath = Join-Path $PSScriptRoot "fixtures\$Status.json"
$body = Get-Content $fixturePath -Raw

$response = Invoke-RestMethod -Uri "$BaseUrl/webhook/gitlab" -Method Post `
    -ContentType "application/json" `
    -Headers @{ "X-Gitlab-Token" = $secret } `
    -Body $body

$response | ConvertTo-Json