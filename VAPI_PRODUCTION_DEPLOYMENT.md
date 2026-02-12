# Vapi Voice Agent - Production Deployment Checklist

## Pre-Deployment Checklist

### ✅ 1. Code is Ready
- [x] All 10 endpoints implemented
- [x] Bearer token authentication in place
- [x] Error handling implemented
- [x] Logging added for debugging

### 2. Environment Variables (CRITICAL - Set in Production)

**Add these to your production environment (Vercel/your hosting platform):**

```env
# Vapi API Tool Authentication (REQUIRED - Generate a new secure token for production)
VAPI_API_TOOL_BEARER_TOKEN=<generate_new_secure_token>

# Public Base URL (REQUIRED - Your production domain)
PUBLIC_BASE_URL=https://merchlab.io
# OR if using Vercel: https://your-app.vercel.app

# Existing variables (should already be set, but verify):
WHATSAPP_ACCESS_TOKEN=<your_whatsapp_token>
WHATSAPP_PHONE_NUMBER_ID=<your_phone_number_id>
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
BARRON_CLIENT_ID=<your_barron_client_id>
BARRON_CLIENT_SECRET=<your_barron_client_secret>
BARRON_REFRESH_TOKEN=<your_barron_refresh_token>
OPENAI_API_KEY=<your_openai_key>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
STAFF_EMAIL=anita@merchlab.io
GMAIL_USER_EMAIL=<your_gmail_account>
```

**⚠️ IMPORTANT:** Generate a NEW secure token for production (don't use your local dev token):
```bash
# Generate production token
openssl rand -hex 32
```

---

## Deployment Steps

### Step 1: Deploy Code to Production

1. **Commit and push all changes:**
   ```bash
   git add .
   git commit -m "Add Vapi voice agent endpoints"
   git push origin main
   ```

2. **Deploy to Vercel (or your hosting platform):**
   - If using Vercel, it should auto-deploy
   - Wait for deployment to complete
   - Verify deployment is successful

### Step 2: Set Production Environment Variables

**In Vercel Dashboard:**
1. Go to your project → Settings → Environment Variables
2. Add/verify all environment variables listed above
3. **CRITICAL:** Set `VAPI_API_TOOL_BEARER_TOKEN` with your new production token
4. **CRITICAL:** Set `PUBLIC_BASE_URL` to your production domain
5. Redeploy if you added new variables

**In other hosting platforms:**
- Follow your platform's instructions for setting environment variables
- Ensure all variables are set before testing

### Step 3: Test Production Endpoints

**Test authentication (should return 401):**
```powershell
$body = '{"caller_phone": "27693475825", "invoice_number": "INV-Q553-HFKTH"}'
curl.exe -X POST https://merchlab.io/api/vapi/get-order-status -H "Content-Type: application/json" -d $body
```

**Test with Bearer token (replace YOUR_PRODUCTION_TOKEN):**
```powershell
$token = "YOUR_PRODUCTION_TOKEN"
$payload = @{
  caller_phone   = "27693475825"
  invoice_number = "INV-Q553-HFKTH"
}
Invoke-RestMethod -Method Post `
  -Uri "https://merchlab.io/api/vapi/get-order-status" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body ($payload | ConvertTo-Json -Compress)
```

**Expected:** Should return `{"ok":true,"data":{...},"spoken_summary":"..."}`

**Test all 10 endpoints:**
- get-order-status ✅
- get-quote-info ✅
- get-invoice-info ✅
- get-customer-account-info ✅
- get-order-details ✅
- get-delivery-info ✅
- escalate-to-human ✅
- search-knowledge-base ✅
- send-whatsapp-message ✅
- send-whatsapp-pdf ✅

---

## Vapi Configuration (After Production Deployment)

### Step 4: Create Custom Credential in Vapi

1. Go to Vapi Dashboard → **Credentials** → **Create New**
2. **Credential Name:** `merchlab-api-bearer-token`
3. **Type:** Custom Credential
4. **Value:** Your production `VAPI_API_TOOL_BEARER_TOKEN` value
5. Save

### Step 5: Create API Request Tools in Vapi

**For each of the 10 tools, create an API Request Tool:**

1. Go to Vapi Dashboard → **Tools** → **Create New** → **API Request Tool**

2. **Use the exact configuration from `VAPI_TOOL_SETUP_PLAINTEXT.txt`**

3. **Important changes for production:**
   - **Request URL:** Use `https://merchlab.io/api/vapi/<endpoint-name>` (replace `{{PUBLIC_BASE_URL}}` with your actual domain)
   - **Authorization:** Select `merchlab-api-bearer-token` credential
   - **caller_phone default:** Use Vapi's phone number variable (check Vapi docs for exact format, might be `{{call.phoneNumber}}` or `{{call.from}}`)

4. **Create all 10 tools:**
   - get_order_status
   - get_quote_info
   - get_invoice_info
   - get_customer_account_info
   - get_order_details
   - get_delivery_info
   - escalate_to_human
   - search_merchlab_knowledge_base
   - send_whatsapp_message
   - send_whatsapp_pdf

### Step 6: Configure Voice Agent in Vapi

1. Go to Vapi Dashboard → **Assistants** → Create/Edit your assistant

2. **Add System Prompt:**
   - Copy the system prompt from `VAPI_SYSTEM_PROMPT.txt` or `VAPI_VOICE_AGENT_BLUEPRINT.md`
   - Paste into the System Prompt field

3. **Enable all 10 tools:**
   - In the Tools section, enable all 10 API Request Tools you created

4. **Configure Voice:**
   - Set up ElevenLabs voice (you mentioned you have this configured)
   - Configure transcriber settings

5. **Link Phone Number:**
   - Link your Vapi phone number to this assistant

---

## Post-Deployment Verification

### Step 7: Test End-to-End

1. **Make a test phone call to your Vapi number**

2. **Test scenarios:**
   - ✅ "What's the status of my order?" (provide invoice number)
   - ✅ "Send me my quote" (should use phone lookup)
   - ✅ "What's my invoice?" (should use phone lookup)
   - ✅ "What orders do I have?"
   - ✅ "What's your refund policy?" (knowledge base search)
   - ✅ "I want to speak to a person" (escalation)
   - ✅ "Send me my quote PDF" (should call get_quote_info then send_whatsapp_pdf)

3. **Verify:**
   - ✅ Voice agent responds correctly
   - ✅ Tools are called successfully
   - ✅ WhatsApp messages/PDFs are sent (if tested)
   - ✅ Escalation emails are sent (if tested)

### Step 8: Monitor Logs

**Check production logs for:**
- Any 401 errors (authentication issues)
- Any 500 errors (server errors)
- Any failed tool calls
- Customer info extraction issues

**In Vercel:**
- Go to your project → **Logs** tab
- Filter for `/api/vapi/` endpoints
- Look for errors or warnings

---

## Troubleshooting

### Issue: 401 Unauthorized
**Solution:**
- Verify `VAPI_API_TOOL_BEARER_TOKEN` is set in production
- Verify the token in Vapi credential matches production token
- Check that Authorization header is being sent correctly

### Issue: 404 Not Found
**Solution:**
- Verify `PUBLIC_BASE_URL` is set correctly
- Verify the endpoint URLs in Vapi tools match your production domain
- Check that deployment was successful

### Issue: Customer info is empty
**Solution:**
- Check server logs for `[getOrderStatus]` and `[getCustomerFromQuote]` messages
- Verify quote/invoice exists in Supabase
- Verify Barron API is returning orders correctly

### Issue: WhatsApp sending fails
**Solution:**
- Verify `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set
- Check WhatsApp Business API status
- Verify phone number format is correct

---

## Security Checklist

- [ ] Production Bearer token is different from dev token
- [ ] Bearer token is stored securely (not in code)
- [ ] All environment variables are set in production
- [ ] HTTPS is enabled (required for production)
- [ ] Rate limiting considered (if needed)
- [ ] Error messages don't expose sensitive info

---

## Rollback Plan

If something goes wrong:

1. **Disable the assistant in Vapi** (unlink phone number)
2. **Check Vercel logs** for errors
3. **Verify environment variables** are correct
4. **Test endpoints individually** with curl/Postman
5. **Fix issues** and redeploy
6. **Re-enable assistant** after verification

---

## Support Contacts

- **Vapi Support:** [Vapi Dashboard Support]
- **Vercel Support:** [Vercel Dashboard Support]
- **Internal:** Check server logs in Vercel dashboard

---

## Quick Reference

**Production Endpoints:**
- Base URL: `https://merchlab.io/api/vapi/`
- Auth: `Authorization: Bearer <VAPI_API_TOOL_BEARER_TOKEN>`
- Content-Type: `application/json`

**Vapi Configuration:**
- Credential: `merchlab-api-bearer-token`
- Tools: 10 API Request Tools
- System Prompt: From `VAPI_SYSTEM_PROMPT.txt`

---

**Last Updated:** 2025-01-28
**Status:** Ready for Production Deployment
