# 🔧 Webhook Troubleshooting Guide

## 🚨 Problem: Not Receiving Notifications (0 Logs)

If you have **0 logs** in your `RAW_Webhook_Log` sheet, the webhook notifications are not reaching your system. This guide will help you diagnose and fix the issue.

---

## 🔍 Step-by-Step Diagnosis

### **STEP 1: Run Complete Diagnostic**

In your Google Sheet:
```
Menu: 🔧 Mercado Libre → 🔗 Webhooks → 🔍 DIAGNÓSTICO COMPLETO
```

This will check:
- ✅ Web App deployment status
- ✅ Script properties (credentials)
- ✅ Webhook registration with Mercado Libre
- ✅ Trigger configuration
- ✅ Sheets existence
- ✅ Notification queue status

The diagnostic will show you exactly what's wrong.

---

## 🛠️ Common Issues and Solutions

### **Issue 1: Web App Not Deployed** ❌

**Symptom:**
- Diagnostic shows: "Web App: NO DESPLEGADO"

**Solution:**
1. Open **Apps Script Editor** (Extensions → Apps Script)
2. Click **Deploy** → **New deployment**
3. Click the gear icon ⚙️ next to "Select type"
4. Select **Web app**
5. Configure:
   - **Description**: "Mercado Libre Webhook"
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone**
6. Click **Deploy**
7. **IMPORTANT**: Copy the Web App URL (looks like: `https://script.google.com/macros/s/ABC.../exec`)
8. Click **Done**

9. Save the URL in your system:
   ```
   Menu: 🔗 Webhooks → 📋 Configurar URL del Web App
   ```
   Paste the URL when prompted.

---

### **Issue 2: Missing Credentials** ❌

**Symptom:**
- Diagnostic shows: "Access Token: NO CONFIGURADO"
- Or: "Token EXPIRADO"

**Solution:**

#### Option A: Interactive Setup (Easiest)
```
Menu: 🔧 Mercado Libre → 🔑 Configurar Credenciales
```
Follow the prompts to enter your credentials.

#### Option B: Manual Setup
1. Go to **Apps Script Editor**
2. Click **Project Settings** (gear icon ⚙️)
3. Scroll to **Script properties**
4. Click **Add script property**
5. Add these properties:

| Property | Value | Where to Get It |
|----------|-------|-----------------|
| `ML_ACCESS_TOKEN` | Your access token | Mercado Libre Developers → Your App → Get Token |
| `ML_REFRESH_TOKEN` | Your refresh token | Same as above |
| `ML_CLIENT_ID` | Your app's client ID | Mercado Libre Developers → Your App → Details |
| `ML_CLIENT_SECRET` | Your app's client secret | Same as above |
| `SELLER_ID` | Your seller ID | Get from ML profile or use API `/users/me` |
| `WEBHOOK_SECRET` | (Optional) Secret for signature validation | Create your own random string |

6. Click **Save script properties**

#### Get Your Tokens from Mercado Libre:
1. Go to: https://developers.mercadolibre.com/
2. Login with your ML account
3. Go to **"Mis aplicaciones"** (My Applications)
4. Select your app (or create one if you don't have it)
5. Get the **Client ID** and **Client Secret**
6. Click **"Generar access token"** to get your tokens

---

### **Issue 3: Webhook Not Registered with Mercado Libre** ❌

**Symptom:**
- Diagnostic shows: "NO HAY WEBHOOK REGISTRADO en Mercado Libre"

**Solution:**
1. First, make sure you have the Web App URL (from Issue 1)
2. Register the webhook:
   ```
   Menu: 🔗 Webhooks → 📝 Registrar Webhook en ML
   ```
3. The system will automatically register your Web App URL with Mercado Libre

**Manual Registration (Alternative):**
If automatic registration fails, you can register manually:

```bash
curl -X POST \
  https://api.mercadolibre.com/applications/YOUR_APP_ID \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "notification_url": "YOUR_WEB_APP_URL"
  }'
```

Replace:
- `YOUR_APP_ID` with your ML_CLIENT_ID
- `YOUR_ACCESS_TOKEN` with your ML_ACCESS_TOKEN
- `YOUR_WEB_APP_URL` with your deployed Web App URL

---

### **Issue 4: No Trigger Configured** ❌

**Symptom:**
- Diagnostic shows: "Trigger de Cola: NO CONFIGURADO"

**Solution:**
```
Menu: 🔗 Webhooks → 🔧 Configurar Trigger de Cola
```

This creates a trigger that runs `processQueuedNotifications()` every 1 minute to process incoming webhooks.

**Verify Trigger:**
1. Go to **Apps Script Editor**
2. Click the **Triggers** icon (clock icon ⏰)
3. You should see: `processQueuedNotifications` running every 1 minute

---

### **Issue 5: Missing Sheets** ❌

**Symptom:**
- Diagnostic shows: "RAW_Webhook_Log: NO EXISTE"

**Solution:**
```
Menu: 🔧 Mercado Libre → ⚙️ Configurar Sistema Completo
```

This creates all required sheets.

---

### **Issue 6: Webhook URL Doesn't Match** ⚠️

**Symptom:**
- Diagnostic shows: "URL registrada no coincide con Web App actual"

**What This Means:**
You re-deployed your Web App and the URL changed, but Mercado Libre still has the old URL.

**Solution:**
Re-register the webhook:
```
Menu: 🔗 Webhooks → 📝 Registrar Webhook en ML
```

---

### **Issue 7: Not Subscribed to Topics** ⚠️

**Symptom:**
- Diagnostic shows: "NO está suscrito a 'items'"

**Solution:**
When you register your webhook, you need to subscribe to notification topics.

Edit `RegisterWebhook.js` and add topics:

```javascript
const payload = {
  notification_url: webAppUrl,
  topics: ["items", "orders", "questions", "payments", "messages", "shipments"]
};
```

Then re-run:
```
Menu: 🔗 Webhooks → 📝 Registrar Webhook en ML
```

---

## 🚀 Quick Fix (All-in-One)

If you're not sure what's wrong, try the Quick Fix:

```
Menu: 🔗 Webhooks → 🔧 Quick Fix (Auto-configurar)
```

This will automatically:
1. Create all required sheets
2. Configure triggers
3. Verify credentials

**BUT:** You still need to:
- Deploy the Web App manually (Google's security requirement)
- Set up your credentials (ML tokens)
- Register the webhook with ML

---

## 🧪 Testing the Webhook

### Test 1: Verify Endpoint is Accessible

```
Menu: 🔗 Webhooks → 🧪 Test Endpoint Manual
```

This shows you how to test your webhook endpoint with curl or Postman.

### Test 2: Simulate a Webhook

```
Menu: 🧪 Tests & Diagnósticos → 📦 Test Webhook Items
```

**IMPORTANT:** Update the item ID in `Test.js` with a real item ID from your store:
```javascript
resource: '/items/MLM123456789', // Replace with your real item ID
```

### Test 3: Make a Real Change in Mercado Libre

1. Go to your Mercado Libre seller account
2. Edit any product (change stock, price, description)
3. Save changes
4. Wait 1-2 minutes
5. Check your `RAW_Webhook_Log` sheet

---

## 📊 Checking Logs

### Where to Check:

**In Google Sheets:**
- `RAW_Webhook_Log` - Raw incoming webhooks
- `Log_Movimientos` - Processed inventory movements
- `Errores_API` - API errors
- `Diagnostico_Webhook` - Latest diagnostic report

**In Apps Script:**
1. Open Apps Script Editor
2. Click **View** → **Logs** (or press `Ctrl+Enter`)
3. Or click **Executions** to see execution history

---

## 🔐 Permissions Issue

### Problem: "Authorization required"

**Solution:**
1. When you first run any function, Google will ask for permissions
2. Click **Review permissions**
3. Choose your Google account
4. Click **Advanced**
5. Click **Go to [Your Project Name] (unsafe)**
6. Click **Allow**

This is normal - Google requires authorization for scripts to:
- Access spreadsheets
- Make external API calls
- Create triggers

---

## 🌐 Mercado Libre App Configuration

### Ensure Your App is Configured Correctly:

1. Go to: https://developers.mercadolibre.com/
2. Select your app
3. Check **"Notificaciones"** section:
   - Notification URL should be set
   - Topics should be selected
   - App should be **active** (not in development mode for production)

### Important: Development vs Production

- **Development/Test Mode**: Notifications may not work or may be limited
- **Production Mode**: Full notifications enabled

Make sure your app is in the correct mode for testing.

---

## 🔄 Step-by-Step: First Time Setup

If you're setting this up for the first time, follow this exact order:

### 1. Configure System
```
Menu: ⚙️ Configurar Sistema Completo
```

### 2. Set Up Credentials
```
Menu: 🔑 Configurar Credenciales
```
Or manually add script properties.

### 3. Deploy Web App
1. Apps Script Editor → Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Copy the URL

### 4. Save Web App URL
```
Menu: 🔗 Webhooks → 📋 Configurar URL del Web App
```

### 5. Register Webhook
```
Menu: 🔗 Webhooks → 📝 Registrar Webhook en ML
```

### 6. Run Diagnostic
```
Menu: 🔗 Webhooks → 🔍 DIAGNÓSTICO COMPLETO
```

### 7. Test
```
Menu: 🧪 Tests & Diagnósticos → 📦 Test Webhook Items
```

### 8. Make a Real Change
- Edit a product in Mercado Libre
- Wait 1-2 minutes
- Check `RAW_Webhook_Log`

---

## ❓ Still Not Working?

### Check These:

1. **Is your ML app approved?**
   - Some apps need approval from ML before webhooks work

2. **Are you using a test account?**
   - Test accounts may have limitations

3. **Check ML API status:**
   - https://api.mercadolibre.com/sites/MLM/health

4. **Network/Firewall:**
   - Make sure Google Apps Script can receive external requests
   - (Usually not an issue, but check if in corporate network)

5. **Check Google Apps Script Quotas:**
   - Free accounts have limits
   - Check: https://developers.google.com/apps-script/guides/services/quotas

### Debug Mode:

Enable detailed logging by adding this to your script:
```javascript
function debugWebhook(e) {
  Logger.log('Webhook received');
  Logger.log('Headers: ' + JSON.stringify(e));
  Logger.log('Content: ' + e.postData.contents);
}
```

---

## 📞 Need More Help?

### Useful Resources:

- **Mercado Libre Webhooks Guide**: https://developers.mercadolibre.com/en_us/manage-notifications
- **Google Apps Script Web Apps**: https://developers.google.com/apps-script/guides/web
- **ML API Status**: https://developers.mercadolibre.com/status

### Check Diagnostic Sheet:

After running the diagnostic, check the `Diagnostico_Webhook` sheet in your spreadsheet for a complete report.

---

**Last Updated**: 2026-01-15
**System Version**: 3.2 PRO
