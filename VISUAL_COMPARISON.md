# CSS SELECTORS - VISUAL COMPARISON

## Side-by-Side Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FIELD EXTRACTION COMPARISON                              │
└─────────────────────────────────────────────────────────────────────────────┘

FIELD: PRODUCT TITLE
┌──────────────┬──────────────────────────────┬────────────────────────────────┐
│ SITE         │ PRIMARY SELECTOR             │ NOTES                          │
├──────────────┼──────────────────────────────┼────────────────────────────────┤
│ AMAZON       │ span#productTitle            │ Most reliable                  │
│              │ ↓ h1.product-title           │ Simple ID selector             │
│ ACADEMY      │ h1[data-auid="title"]        │ Use data attributes            │
│              │ ↓ <title> tag                │ Meta tag as backup             │
│ EBAY         │ h1#itemTitle                 │ Clear ID-based selector        │
│              │ ↓ <meta property="og:title"> │ Meta tag fallback              │
│ MERCADOLIBRE │ h1[class*="title"]           │ JSON-LD preferred (see below)  │
│              │ ↓ JSON-LD: .name field       │ Structured data most reliable  │
└──────────────┴──────────────────────────────┴────────────────────────────────┘

FIELD: PRODUCT PRICE
┌──────────────┬──────────────────────────────┬────────────────────────────────┐
│ SITE         │ PRIMARY SELECTOR             │ NOTES                          │
├──────────────┼──────────────────────────────┼────────────────────────────────┤
│ AMAZON       │ span.a-price-whole +         │ Usually split into 2 spans     │
│              │ span.a-price-fraction        │ Combine both for full price    │
│ ACADEMY      │ span[class*="price"]         │ Hash-generated classes         │
│              │ ↓ Look for number content    │ Search for first matching      │
│ EBAY         │ span.notranslate            │ Notranslate is helpful hint    │
│              │ .vi-VR-cvipPrice            │ Very specific eBay structure   │
│ MERCADOLIBRE │ JSON-LD: .offers.price      │ Recommended: structured data   │
│              │ ↓ span[class*="price"]       │ Multiple prices may exist      │
└──────────────┴──────────────────────────────┴────────────────────────────────┘

FIELD: AVAILABILITY/STOCK
┌──────────────┬──────────────────────────────┬────────────────────────────────┐
│ SITE         │ PRIMARY SELECTOR             │ NOTES                          │
├──────────────┼──────────────────────────────┼────────────────────────────────┤
│ AMAZON       │ div#availability span        │ Text-based status              │
│              │ ↓ Text search: "In Stock"    │ May show other options         │
│ ACADEMY      │ [class*="availability"]      │ Often near price section       │
│              │ ↓ [class*="stock"]           │ Multiple class possibilities   │
│ EBAY         │ [class*="vi-acc-del-range"]  │ Auction-specific structure     │
│              │ ↓ Text search: "Out of stock"│ Search page content            │
│ MERCADOLIBRE │ JSON-LD: .availability      │ Use structured data first      │
│              │ ↓ span[class*="stock"]       │ Spanish: "En stock"            │
└──────────────┴──────────────────────────────┴────────────────────────────────┘

FIELD: PRODUCT IMAGE
┌──────────────┬──────────────────────────────┬────────────────────────────────┐
│ SITE         │ PRIMARY SELECTOR             │ NOTES                          │
├──────────────┼──────────────────────────────┼────────────────────────────────┤
│ AMAZON       │ img#landingImage             │ Main hero image                │
│              │ ↓ img.s-image                │ Can use srcset for larger      │
│ ACADEMY      │ img[src*="scene7.com"]       │ Scene7 is Academy's CDN        │
│              │ ↓ with $pdp-gallery-ng$     │ Parameter for full-size        │
│ EBAY         │ img#vi_main                  │ Main viewer image              │
│              │ ↓ img[src*="ebayimg"]        │ ebayimg.com CDN                │
│ MERCADOLIBRE │ JSON-LD: .image[0]           │ Array of images in structured  │
│              │ ↓ img[src*="mlstatic.com"]   │ mlstatic CDN                   │
└──────────────┴──────────────────────────────┴────────────────────────────────┘
```

## Extraction Method Comparison

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    EXTRACTION METHODS BY EFFECTIVENESS                        │
└───────────────────────────────────────────────────────────────────────────────┘

METHOD 1: JSON-LD STRUCTURED DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platforms: ✅ Amazon  ✅ Academy  ✅ eBay  ✅ Mercado Libre
  Success Rate: 95%+
  Maintenance: ⭐⭐ (very low)
  Speed: ⚡⚡⚡ (very fast)
  
  Code Example:
  const data = JSON.parse(
    document.querySelector('script[type="application/ld+json"]').textContent
  );
  const { name, offers: { price }, image } = data;

METHOD 2: META TAGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platforms: ✅ Amazon  ✅ Academy  ✅ eBay  ✅ Mercado Libre
  Success Rate: 90%
  Maintenance: ⭐⭐ (low)
  Speed: ⚡⚡⚡ (very fast)
  
  Tags Used:
  - <title>                           → Product title
  - <meta property="og:title">        → Product title
  - <meta property="og:image">        → Product image
  - <meta property="og:description">  → Description
  - <meta property="og:price:amount"> → Price (if available)

METHOD 3: DATA ATTRIBUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platforms: ✅ Academy  ⚠️  eBay  ⚠️  Mercado Libre
  Success Rate: 70-80%
  Maintenance: ⭐⭐⭐ (moderate)
  Speed: ⚡⚡⚡ (very fast)
  
  Selectors:
  - [data-auid="..."]        → Academy specific
  - [data-testid="..."]      → Modern React apps
  - [data-product-id]        → Some sites

METHOD 4: ID-BASED SELECTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platforms: ✅ Amazon  ⚠️  eBay
  Success Rate: 80-90%
  Maintenance: ⭐⭐ (low)
  Speed: ⚡⚡⚡ (very fast)
  
  Examples:
  - #productTitle    → Amazon
  - #itemTitle       → eBay
  - #vi_main         → eBay (image)
  - #landingImage    → Amazon (image)

METHOD 5: CLASS-BASED SELECTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Platforms: ⚠️  All (poor choice)
  Success Rate: 60-70%
  Maintenance: ⭐⭐⭐⭐⭐ (high - changes frequently)
  Speed: ⚡⚡⚡ (very fast)
  
  Issues:
  ❌ Auto-generated class names
  ❌ Change on every site update
  ❌ Different per product type
  ❌ Not portable across sites
  
  Only use as LAST RESORT

METHOD 6: TEXT SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Use Case: Availability status
  Success Rate: 85%
  Speed: ⚡ (slower - searches all text)
  
  Examples:
  - /in stock|available/i.test(document.body.innerText)
  - /out of stock|sold out/i.test(document.body.innerText)
  - /sin existencias/i.test(document.body.innerText)  → Spanish
```

## Technology Stack Comparison

```
┌──────────────┬──────────────┬─────────────┬────────────────┬─────────────────┐
│ PLATFORM     │ JAVASCRIPT   │ FRAMEWORK   │ CSS APPROACH   │ RENDERING       │
├──────────────┼──────────────┼─────────────┼────────────────┼─────────────────┤
│ Amazon       │ Heavy        │ React       │ CSS-in-JS      │ Client-side     │
│              │ (90%)        │             │ (auto-classes) │ (~3-5 seconds)  │
├──────────────┼──────────────┼─────────────┼────────────────┼─────────────────┤
│ Academy      │ Heavy        │ Next.js     │ CSS-in-JS      │ SSR + CSR       │
│              │ (85%)        │ (React)     │ (styled-comp)  │ (~2-4 seconds)  │
├──────────────┼──────────────┼─────────────┼────────────────┼─────────────────┤
│ eBay         │ Moderate     │ Mixed       │ Traditional    │ Hybrid          │
│              │ (70%)        │ (Legacy)    │ + auto-gen     │ (~2-3 seconds)  │
├──────────────┼──────────────┼─────────────┼────────────────┼─────────────────┤
│ Mercado      │ Heavy        │ React       │ CSS-in-JS      │ Client-side     │
│ Libre        │ (95%)        │             │ (auto-classes) │ (~4-6 seconds)  │
└──────────────┴──────────────┴─────────────┴────────────────┴─────────────────┘

IMPLICATIONS FOR SCRAPING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ALL sites require headless browser for complete data
✅ Static HTML parsing will get titles only
✅ JSON-LD is most reliable cross-platform solution
⚠️  Class selectors require constant maintenance
⚠️  Different products may have different structures
```

## Decision Matrix

```
WHICH METHOD TO USE?

START HERE:
           ┌─────────────────────────────────┐
           │ Try JSON-LD First               │
           └────────────┬────────────────────┘
                        │
                ┌───────┴───────┐
                │               │
            FOUND         NOT FOUND
              │               │
              ✅              ↓
           SUCCESS     ┌─────────────────────┐
           (use it)    │ Try Meta Tags       │
                       └────────┬────────────┘
                                │
                        ┌───────┴───────┐
                        │               │
                    FOUND         NOT FOUND
                      │               │
                      ✅              ↓
                   SUCCESS      ┌──────────────────────┐
                   (use it)     │ Use Data Attributes  │
                                │ Or ID Selectors      │
                                └────────┬─────────────┘
                                         │
                                 ┌───────┴───────┐
                                 │               │
                             FOUND         NOT FOUND
                               │               │
                               ✅              ↓
                            SUCCESS      ⚠️  FALLBACK
                            (use it)     (class selectors)

RECOMMENDATION MATRIX:

GOAL:              METHOD:                        EXPECTED SUCCESS:
────────────────────────────────────────────────────────────────────
Fastest Setup      → Meta Tags + JSON-LD          90%+ ✅
Most Reliable      → JSON-LD + Fallbacks          95%+ ✅✅
Easy Maintenance   → Data Attributes + IDs        80%+ ✅
Highest Coverage   → All methods combined         98%+ ✅✅✅
Production Ready   → Puppeteer + JSON-LD         99%+ ✅✅✅✅
```

## Performance Benchmarks

```
EXTRACTION TIME PER PRODUCT:

JSON-LD Only (headless browser):
┌──────────────┬──────────────────┬──────────┐
│ Platform     │ Load Time        │ Parse    │
├──────────────┼──────────────────┼──────────┤
│ Amazon       │ 3-5s             │ <100ms   │
│ Academy      │ 2-4s             │ <100ms   │
│ eBay         │ 2-3s             │ <100ms   │
│ Mercado Lib  │ 4-6s             │ <100ms   │
├──────────────┼──────────────────┼──────────┤
│ TOTAL        │ 2-6s average     │ <100ms   │
└──────────────┴──────────────────┴──────────┘

RESOURCE USAGE PER BROWSER INSTANCE:

Memory:  100-150 MB
CPU:     20-30% (during load)
Network: ~500KB per page
Time:    2-6 seconds per URL

OPTIMAL BATCH PROCESSING:

Parallel instances:  3-5 (depending on hardware)
Rate per instance:   10 products/minute
Combined rate:       30-50 products/minute
Memory needed:       500MB - 1GB
CPU needed:          2-4 cores
```

## Failure Modes & Recovery

```
COMMON FAILURES AND SOLUTIONS:

┌─────────────────────────────────────────────────────────────────┐
│ FAILURE MODE 1: Selectors Return Empty                          │
├─────────────────────────────────────────────────────────────────┤
│ Causes:                                                         │
│  • Page not fully loaded                                        │
│  • JavaScript not executed                                      │
│  • Selector path changed                                        │
│  • Dynamic content (different per instance)                     │
│                                                                 │
│ Recovery (in order):                                            │
│  1. ✅ Increase wait time (try networkidle2)                    │
│  2. ✅ Use JSON-LD (most reliable)                              │
│  3. ✅ Try alternative selectors                                │
│  4. ✅ Log and flag for manual review                           │
│  5. ❌ Skip item (last resort)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FAILURE MODE 2: Rate Limiting / IP Blocking                     │
├─────────────────────────────────────────────────────────────────┤
│ Indicators:                                                     │
│  • 429 Too Many Requests                                        │
│  • 403 Forbidden                                                │
│  • Captcha required                                             │
│  • Timeout errors                                               │
│                                                                 │
│ Recovery (in order):                                            │
│  1. ✅ Add exponential backoff delays                           │
│  2. ✅ Rotate User-Agent headers                                │
│  3. ✅ Use proxy rotation                                       │
│  4. ✅ Implement request queuing                                │
│  5. ❌ Stop and retry later                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FAILURE MODE 3: Inconsistent Data                               │
├─────────────────────────────────────────────────────────────────┤
│ Causes:                                                         │
│  • Price/stock changes between requests                         │
│  • A/B testing (different layouts)                              │
│  • Regional variations                                          │
│  • Device-specific rendering                                    │
│                                                                 │
│ Recovery:                                                       │
│  1. ✅ This is expected and normal                              │
│  2. ✅ Timestamp each extraction                                │
│  3. ✅ Log differences for analysis                             │
│  4. ✅ Not an error - expected behavior                         │
└─────────────────────────────────────────────────────────────────┘
```

## Summary Table

```
QUICK DECISION TABLE:

┌──────────────┬────────────────┬────────────────┬─────────────┬─────────┐
│ Need?        │ Use This       │ Success Rate   │ Setup Time  │ Notes   │
├──────────────┼────────────────┼────────────────┼─────────────┼─────────┤
│ Quick test   │ Console paste  │ 70%            │ 1 minute    │ Testing │
│ Prototype    │ BeautifulSoup  │ 30%            │ 10 minutes  │ Limited │
│ MVP          │ Puppeteer      │ 95%            │ 1 hour      │ Fast    │
│ Production   │ Puppeteer +    │ 99%            │ 4 hours     │ Best    │
│              │ JSON-LD +      │                │             │         │
│              │ Fallbacks      │                │             │         │
│ Scale        │ Distributed    │ 99%            │ 1-2 days    │ Complex │
│              │ Puppeteer      │                │             │         │
└──────────────┴────────────────┴────────────────┴─────────────┴─────────┘
```

---

**Legend:**
- ✅ Recommended
- ⚠️ Use with caution
- ❌ Not recommended
- ⭐⭐⭐ High maintenance
- ⚡⚡⚡ Very fast

