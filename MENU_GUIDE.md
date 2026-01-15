# 🔧 Mercado Libre System - Complete Menu Guide

This guide documents all available functions in the Google Sheets menu system.

---

## 📋 Main Menu: 🔧 Mercado Libre

### ⚙️ Setup & Configuration

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **⚙️ Configurar Sistema Completo** | `setup()` | Creates all necessary sheets, sets timezone, and configures triggers |
| **🔑 Configurar Credenciales** | `setupCredentials()` | Interactive setup for ML API credentials (tokens, client ID/secret) |
| **🔄 Refrescar Token** | `forceRefreshToken()` | Manually refresh the Mercado Libre access token |

---

## 🧪 Tests & Diagnósticos

Complete testing suite for system validation and webhook simulation.

### System Diagnostics

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **🔬 Test Completo del Sistema** | `runFullSystemTest()` | Comprehensive system test: sheets, API, webhooks |
| **🔍 Diagnóstico Profundo** | `deepDiagnostics()` | Deep system diagnostics with detailed logging |

### Webhook Testing

Test individual webhook notification types:

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **📦 Test Webhook Items** | `testWebhookSimulation()` | Simulate item change notification |
| **🛒 Test Webhook Orders** | `testOrderNotification()` | Simulate order notification |
| **❓ Test Webhook Questions** | `testQuestionNotification()` | Simulate customer question notification |
| **💳 Test Webhook Payments** | `testPaymentNotification()` | Simulate payment notification |
| **💬 Test Webhook Messages** | `testMessageNotification()` | Simulate message notification |
| **📮 Test Webhook Shipments** | `testShipmentNotification()` | Simulate shipment notification |
| **❌ Test Webhook Inválido** | `testInvalidWebhook()` | Test invalid webhook payload handling |
| **🎭 Test Tópico No Manejado** | `testUnhandledTopicNotification()` | Test unhandled topic handling |

### Queue Management (Testing)

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **⚙️ Procesar Cola Manualmente** | `testProcessQueue()` | Manually process queued notifications |
| **👁️ Ver Cola de Notificaciones** | `viewNotificationQueue()` | View all pending notifications in queue |
| **🧹 Limpiar Cola** | `clearNotificationQueue()` | Clear the notification queue |

---

## 📦 Inventario

Inventory management and synchronization functions.

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **🔄 Auditoría Completa (6k+ items)** | `fullInventoryAudit()` | Full inventory sync using Scroll API (handles 6000+ items) |
| **📊 Actualizar Stock desde Snapshot** | `bulkUpdateStockFromSnapshot()` | Bulk update ML stock from Snapshot_Inventario sheet |
| **📈 Analizar Patrones de Stock** | `analyzeStockPatterns()` | Analyze stock movement patterns and detect anomalies |
| **⚖️ Auditoría ML vs UpSeller** | `runSyncAudit()` | Compare Mercado Libre inventory with UpSeller data |
| **📉 Reporte Velocidad Ventas** | `generateSalesVelocityReport()` | Generate sales velocity report for restocking insights |
| **📦 Notificar Sin Stock (UpSeller)** | `notifyOutOfStock()` | Check UpSeller for out-of-stock items and notify |

---

## 🔗 Webhooks

Webhook configuration and management.

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **📝 Registrar Webhook en ML** | `registerWebhook()` | Register webhook URL with Mercado Libre API |
| **✅ Verificar Estado Webhook** | `verifyWebhookStatus()` | Check current webhook registration status |
| **🔄 Recuperar Notificaciones Perdidas** | `checkMissedFeeds()` | Check for and process missed notifications |
| **🔧 Configurar Trigger de Cola** | `setupNotificationTrigger()` | Setup/reset the 1-minute notification processing trigger |
| **👁️ Ver Cola Pendiente** | `viewNotificationQueue()` | View pending notifications in queue |
| **⚙️ Procesar Cola Ahora** | `processQueuedNotifications()` | Immediately process all queued notifications |

---

## 📊 Reportes

Reporting and analytics functions.

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **📋 Reporte Diario** | `generateDailyReport()` | Generate daily inventory movement report |
| **📅 Reporte Semanal (Enviar)** | `sendWeeklyReport()` | Send weekly summary report via email |
| **⏰ Programar Reportes Automáticos** | `scheduleAutomaticReports()` | Schedule automatic daily reports |
| **📅 Activar Reporte Semanal** | `scheduleWeeklyReport()` | Schedule automatic weekly reports |
| **💰 Calcular Finanzas** | `updateFinancials()` | Calculate financial metrics (retail, cost, profit, margin) |
| **📧 Enviar Reporte Diario por Email** | `sendDailyReportEmail()` | Send daily report via email |

---

## 🔧 Mantenimiento

System maintenance and housekeeping.

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **🧹 Archivar Logs Antiguos** | `promptArchiveLogs()` | Archive old logs (interactive - prompts for days to keep) |
| **🗓️ Programar Limpieza Automática** | `scheduleMaintenance()` | Schedule automatic monthly maintenance |
| **🔄 Mantenimiento Mensual Completo** | `runMonthlyMaintenance()` | Run complete monthly maintenance routine |
| **📊 Actualizar Stats del Dashboard** | `updateDashboardStats()` | Refresh Dashboard statistics |
| **🔄 Reiniciar Sistema Completo** | `restartSystem()` | Complete system restart (clears triggers and resets) |

---

## 🛠️ Utilidades

Utility functions for data management and debugging.

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **💾 Exportar Log a CSV** | `exportLogToCSV()` | Export Log_Movimientos to CSV file in Google Drive |
| **📋 Exportar Propiedades del Proyecto** | `exportarPropiedadesProyecto()` | Export script properties to sheet for backup |
| **📥 Importar Propiedades desde Hoja** | `importarPropiedadesDesdeHoja()` | Import script properties from sheet |
| **🗺️ Generar Mapa de Estructura** | `uiGenerarMapa()` | Generate AI-powered spreadsheet structure map |
| **📝 Formatear Hoja de Compras** | `formatearCompras()` | Format the Compras (purchases) sheet |
| **🔧 Corregir Seller ID** | `fixBadSellerId()` | Fix incorrect seller ID in configurations |

---

## 🛑 Danger Zone

| Menu Item | Function | Description |
|-----------|----------|-------------|
| **🛑 DETENER TODOS LOS TRIGGERS** | `killAllTriggers()` | Delete ALL project triggers (use with caution!) |

---

## 📚 Function Details by Module

### Main System Functions (main.js)

**Core Functions:**
- `setup()` - Initial system configuration
- `doPost(e)` - Webhook endpoint (deployed as web app)
- `processQueuedNotifications()` - Background queue processor (runs every 1 minute)
- `fullInventoryAudit()` - Complete inventory synchronization
- `forceRefreshToken()` - Manual token refresh

**Sheet Setup Functions:**
- `setupSnapshotInventario(ss)` - Setup inventory snapshot sheet
- `setupDashboard(ss)` - Setup dashboard sheet
- `setupLogMovimientos(ss)` - Setup movement log sheet
- `setupRawWebhookLog(ss)` - Setup raw webhook log sheet
- `setupErroresAPI(ss)` - Setup API error log sheet

**Webhook Processing:**
- `processNotification(notification, accessToken)` - Route notifications by topic
- `processItemNotification(notification, accessToken)` - Process item changes
- `processOrderNotification(notification, accessToken)` - Process orders
- `processQuestionNotification(notification, accessToken)` - Process questions
- `processPaymentNotification(notification, accessToken)` - Process payments
- `processMessageNotification(notification, accessToken)` - Process messages
- `processShipmentNotification(notification, accessToken)` - Process shipments

**Data Processing:**
- `processItemDetails(itemIds)` - Batch process item details
- `fetchAndProcessBatch(currentScrollId)` - Scroll API batch processor

**Logging:**
- `logMovement(id, sku, oldS, newS, diff, reason, status)` - Log inventory movements
- `logError(func, code, msg, details)` - Log API errors
- `logOrderToSheet(order)` - Log order data
- `logQuestionToSheet(question)` - Log question data
- `logPaymentToSheet(payment)` - Log payment data
- `logMessageToSheet(message)` - Log message data
- `logShipmentToSheet(shipment)` - Log shipment data

### Testing Functions (Test.js)

All functions prefixed with `test*` for webhook simulation:
- `testWebhookSimulation()` - Item notifications
- `testOrderNotification()` - Order notifications
- `testQuestionNotification()` - Question notifications
- `testPaymentNotification()` - Payment notifications
- `testMessageNotification()` - Message notifications
- `testShipmentNotification()` - Shipment notifications
- `testUnhandledTopicNotification()` - Unknown topics
- `testInvalidWebhook()` - Invalid payloads
- `runFullSystemTest()` - Complete system test

**Queue Management:**
- `testProcessQueue()` - Manual queue processing
- `viewNotificationQueue()` - View queue contents
- `clearNotificationQueue()` - Clear queue

### Token Management (tokenz.js)

- `getAccessToken()` - Get current access token
- `refreshAccessToken()` - Refresh expired token
- `setupCredentials()` - Interactive credential setup

### Advanced Features (advanced_features.js)

**Data Export:**
- `exportLogToCSV()` - Export logs to CSV

**Maintenance:**
- `archiveOldLogs(daysToKeep)` - Archive old entries
- `cleanSheet(ss, sheetName, archiveName, daysToKeep)` - Generic sheet cleaner

**Reports:**
- `generateDailyReport()` - Daily summary
- `analyzeStockPatterns()` - Pattern analysis
- `sendDailyReportEmail()` - Email reports

**Configuration:**
- `verifyWebhookStatus()` - Check webhook status
- `bulkUpdateStockFromSnapshot()` - Bulk stock updates
- `updateItemStock(itemId, newStock)` - Single item update
- `scheduleAutomaticReports()` - Schedule reports
- `updateDashboardStats()` - Update dashboard

### Specialized Modules

**Diagnostics.js**
- `deepDiagnostics()` - Deep system diagnostics

**Financials.js**
- `updateFinancials()` - Calculate financial metrics

**FixSellerId.js**
- `fixBadSellerId()` - Repair seller ID

**Maintenance.js**
- `scheduleMaintenance()` - Schedule maintenance
- `runMonthlyMaintenance()` - Run monthly maintenance

**MissedFeeds.js**
- `checkMissedFeeds()` - Check for missed notifications

**RegisterWebhook.js**
- `registerWebhook()` - Register webhook with ML

**Reset.js**
- `killAllTriggers()` - Delete all triggers
- `restartSystem()` - Complete system restart

**SalesVelocity.js**
- `generateSalesVelocityReport()` - Sales velocity analysis

**SyncAudit.js**
- `runSyncAudit()` - ML vs UpSeller comparison

**UpSeller.js**
- `notifyOutOfStock()` - Out of stock notifications

**WeeklyReport.js**
- `scheduleWeeklyReport()` - Schedule weekly reports
- `sendWeeklyReport()` - Send weekly summary

**Estructura.js**
- `uiGenerarMapa()` - Generate structure map
- `construirMapaSpreadsheet(options)` - Build spreadsheet map

**Exporta_Propiedades.js**
- `exportarPropiedadesProyecto()` - Export properties
- `importarPropiedadesDesdeHoja()` - Import properties

**FormatearHojas.js / Code.js**
- `formatearCompras()` - Format purchases sheet

---

## 🚀 Quick Start Testing Sequence

1. **Setup**: `⚙️ Configurar Sistema Completo`
2. **Credentials**: `🔑 Configurar Credenciales`
3. **Test System**: `🧪 Tests → 🔬 Test Completo del Sistema`
4. **Test Webhooks**: Run individual webhook tests
5. **Sync Inventory**: `📦 Inventario → 🔄 Auditoría Completa`
6. **Register Webhook**: `🔗 Webhooks → 📝 Registrar Webhook en ML`
7. **Monitor**: Check Dashboard and logs

---

## 📝 Notes

- All menu functions are accessible from the Google Sheets top menu bar
- Functions marked with ⚠️ in descriptions require caution
- Testing functions use fake data - replace IDs with real ones for accurate testing
- Background functions (like `processQueuedNotifications`) run automatically via triggers
- Always check execution logs for detailed information: `Apps Script Editor → View → Logs`

---

## 🔒 Script Properties Required

Set these in: `Apps Script Editor → Project Settings → Script Properties`

```
ML_ACCESS_TOKEN: [Your access token]
ML_REFRESH_TOKEN: [Your refresh token]
ML_CLIENT_ID: [Your app client ID]
ML_CLIENT_SECRET: [Your app client secret]
SELLER_ID: [Your seller ID]
WEBHOOK_SECRET: [Optional - for signature verification]
```

---

## 📊 Sheets Created by Setup

- **Dashboard** - System overview and statistics
- **Snapshot_Inventario** - Current inventory snapshot
- **Log_Movimientos** - Movement history
- **Errores_API** - API error log
- **RAW_Webhook_Log** - Raw webhook data
- **Pedidos_ML** - Orders (created on first order)
- **Preguntas_ML** - Questions (created on first question)
- **Pagos_ML** - Payments (created on first payment)
- **Mensajes_ML** - Messages (created on first message)
- **Envios_ML** - Shipments (created on first shipment)
- **Notificaciones_Raw** - Unhandled notifications

---

Last Updated: 2026-01-15
System Version: 3.2 PRO
