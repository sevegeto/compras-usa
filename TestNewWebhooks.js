/**
 * TEST SUITE FOR NEW WEBHOOKS
 * Simulates notifications for VIS Leads, Claims, Invoices, etc.
 */

function runAllNewWebhookTests() {
    testVisLeadNotification();
    testClaimNotification();
    testInvoiceNotification();
    testCatalogCompetitionNotification();
    testPublicOffersNotification();
    testLeadCreditNotification();
}

/**
 * 1. Test VIS Leads (Vehicles, Real Estate)
 */
function testVisLeadNotification() {
    Logger.log('🧪 Testing VIS Lead Notification...');
    const fakeNotification = {
        parameter: {},
        postData: {
            contents: JSON.stringify({
                "_id": "test-vis-lead-id",
                "topic": "vis_leads",
                "resource": "/vis/leads/mock-lead-12345",
                "user_id": 123456789,
                "application_id": 123456789,
                "sent": new Date().toISOString(),
                "attempts": 1,
                "actions": ["whatsapp", "question"]
            })
        }
    };

    doPost(fakeNotification);
    Logger.log('✅ VIS Lead simulated.');
}

/**
 * 2. Test Claims (Post Purchase)
 */
function testClaimNotification() {
    Logger.log('🧪 Testing Claim Notification...');
    const fakeNotification = {
        parameter: {},
        postData: {
            contents: JSON.stringify({
                "topic": "post_purchase",
                "resource": "/post-purchase/v1/claims/mock-claim-555",
                "user_id": 123456789,
                "application_id": 123456789,
                "sent": new Date().toISOString(),
                "attempts": 1,
                "actions": ["claims"]
            })
        }
    };

    doPost(fakeNotification);
    Logger.log('✅ Claim simulated.');
}

/**
 * 3. Test Invoices
 */
function testInvoiceNotification() {
    Logger.log('🧪 Testing Invoice Notification...');
    const fakeNotification = {
        parameter: {},
        postData: {
            contents: JSON.stringify({
                "topic": "invoices",
                "resource": "/users/123456789/invoices/mock-invoice-999",
                "user_id": 123456789,
                "application_id": 123456789,
                "sent": new Date().toISOString()
            })
        }
    };

    doPost(fakeNotification);
    Logger.log('✅ Invoice simulated.');
}

/**
 * 4. Test Catalog Competition
 */
function testCatalogCompetitionNotification() {
    Logger.log('🧪 Testing Catalog Competition...');
    const fakeNotification = {
        parameter: {},
        postData: {
            contents: JSON.stringify({
                "topic": "catalog_item_competition_status",
                "resource": "/items/MLA123456/price_to_win",
                "user_id": 123456789,
                "application_id": 123456789,
                "sent": new Date().toISOString()
            })
        }
    };

    doPost(fakeNotification);
    Logger.log('✅ Catalog Competition simulated.');
}

/**
 * 5. Test Public Offers
 */
function testPublicOffersNotification() {
    Logger.log('🧪 Testing Public Offers...');
    const fakeNotification = {
        parameter: {},
        postData: {
            contents: JSON.stringify({
                "topic": "public_offers",
                "resource": "/seller-promotions/offers/mock-offer-777",
                "user_id": 123456789,
                "application_id": 123456789,
                "sent": new Date().toISOString()
            })
        }
    };

    doPost(fakeNotification);
    Logger.log('✅ Public Offer simulated.');
}


/**
 * 6. Test Leads Credits
 */
function testLeadCreditNotification() {
    Logger.log('🧪 Testing Leads Credits...');
    const fakeNotification = {
        parameter: {},
        postData: {
            contents: JSON.stringify({
                "topic": "leads-credits",
                "resource": "/vis/loans/mock-credit-888",
                "user_id": 123456789,
                "application_id": 123456789,
                "sent": new Date().toISOString()
            })
        }
    };

    doPost(fakeNotification);
    Logger.log('✅ Lead Credit simulated.');
}
