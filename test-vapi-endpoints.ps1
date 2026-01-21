# Vapi Endpoint Testing Script for PowerShell
# Uses Invoke-RestMethod (better than curl.exe for PowerShell)
# Replace YOUR_TOKEN with your actual Bearer token

$BASE_URL = "http://localhost:3000"
$TOKEN = "YOUR_TOKEN_HERE"  # Replace with your actual token
$PHONE = "27693475825"       # Replace with a real phone number
$INVOICE = "INV-Q553-HFKTH"  # Replace with a real invoice number
$QUOTE = "Q553-HFKTH"        # Replace with a real quote number

Write-Host "Testing Vapi Endpoints..." -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Helper function to make requests
function Test-VapiEndpoint {
    param(
        [string]$Endpoint,
        [hashtable]$Payload,
        [string]$TestName
    )
    
    Write-Host "Test: $TestName" -ForegroundColor Green
    try {
        $response = Invoke-RestMethod -Method Post `
            -Uri "$BASE_URL/api/vapi/$Endpoint" `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -ContentType "application/json" `
            -Body ($Payload | ConvertTo-Json -Compress)
        
        $response | Format-List
        Write-Host "✓ Success" -ForegroundColor Green
    } catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

# Test 1: get-order-status (without token - should return 401)
Write-Host "Test 1: get-order-status (no token - should fail)" -ForegroundColor Yellow
try {
    $payload = @{
        caller_phone   = $PHONE
        invoice_number = $INVOICE
    }
    Invoke-RestMethod -Method Post `
        -Uri "$BASE_URL/api/vapi/get-order-status" `
        -ContentType "application/json" `
        -Body ($payload | ConvertTo-Json -Compress)
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ Correctly returned 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected error: $_" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Test 2: get-order-status (with token)
Test-VapiEndpoint -Endpoint "get-order-status" `
    -Payload @{
        caller_phone   = $PHONE
        invoice_number = $INVOICE
    } `
    -TestName "get-order-status"

# Test 3: get-quote-info (with quote number)
Test-VapiEndpoint -Endpoint "get-quote-info" `
    -Payload @{
        caller_phone = $PHONE
        quote_number = $QUOTE
    } `
    -TestName "get-quote-info (with quote number)"

# Test 4: get-quote-info (without quote number - phone lookup)
Test-VapiEndpoint -Endpoint "get-quote-info" `
    -Payload @{
        caller_phone = $PHONE
        quote_number = ""
    } `
    -TestName "get-quote-info (phone lookup)"

# Test 5: get-invoice-info (with invoice number)
Test-VapiEndpoint -Endpoint "get-invoice-info" `
    -Payload @{
        caller_phone   = $PHONE
        invoice_number = $INVOICE
    } `
    -TestName "get-invoice-info (with invoice number)"

# Test 6: get-invoice-info (without invoice number - phone lookup)
Test-VapiEndpoint -Endpoint "get-invoice-info" `
    -Payload @{
        caller_phone   = $PHONE
        invoice_number = ""
    } `
    -TestName "get-invoice-info (phone lookup)"

# Test 7: get-customer-account-info (using phone)
Test-VapiEndpoint -Endpoint "get-customer-account-info" `
    -Payload @{
        caller_phone = $PHONE
        identifier   = ""
    } `
    -TestName "get-customer-account-info (phone)"

# Test 8: get-customer-account-info (using email identifier)
Test-VapiEndpoint -Endpoint "get-customer-account-info" `
    -Payload @{
        caller_phone = $PHONE
        identifier   = "john@acme.com"
    } `
    -TestName "get-customer-account-info (email)"

# Test 9: get-order-details
Test-VapiEndpoint -Endpoint "get-order-details" `
    -Payload @{
        caller_phone   = $PHONE
        invoice_number = $INVOICE
    } `
    -TestName "get-order-details"

# Test 10: get-delivery-info
Test-VapiEndpoint -Endpoint "get-delivery-info" `
    -Payload @{
        caller_phone   = $PHONE
        invoice_number = $INVOICE
    } `
    -TestName "get-delivery-info"

# Test 11: escalate-to-human
Test-VapiEndpoint -Endpoint "escalate-to-human" `
    -Payload @{
        caller_phone         = $PHONE
        reason               = "Customer requested to speak with human"
        conversation_summary = "Test escalation from PowerShell script"
    } `
    -TestName "escalate-to-human"

# Test 12: search-knowledge-base (basic search)
Test-VapiEndpoint -Endpoint "search-knowledge-base" `
    -Payload @{
        caller_phone = $PHONE
        query        = "What is your refund policy?"
        topK         = 5
    } `
    -TestName "search-knowledge-base (basic)"

# Test 13: search-knowledge-base (with doc_type filter)
Test-VapiEndpoint -Endpoint "search-knowledge-base" `
    -Payload @{
        caller_phone = $PHONE
        query        = "refund policy"
        topK         = 5
        doc_type     = "refund_policy"
    } `
    -TestName "search-knowledge-base (filtered)"

# Test 14: send-whatsapp-message
Test-VapiEndpoint -Endpoint "send-whatsapp-message" `
    -Payload @{
        caller_phone = $PHONE
        message      = "Test message from Vapi endpoint testing script"
    } `
    -TestName "send-whatsapp-message"

# Test 15: send-whatsapp-pdf
Test-VapiEndpoint -Endpoint "send-whatsapp-pdf" `
    -Payload @{
        caller_phone  = $PHONE
        document_url  = "https://example.com/test.pdf"
        caption       = "Test PDF from Vapi endpoint"
        filename      = "test.pdf"
    } `
    -TestName "send-whatsapp-pdf"

Write-Host "==========================" -ForegroundColor Cyan
Write-Host "Testing complete!" -ForegroundColor Cyan
