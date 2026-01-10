# QUICK REFERENCE: CSS SELECTORS FOR PRODUCT EXTRACTION

## 1. AMAZON (amazon.com)

```
TITLE:        span#productTitle
PRICE:        span.a-price-whole + span.a-price-fraction
              OR span.a-price.a-text-price
AVAILABILITY: div#availability span
IMAGE:        img#landingImage
              OR img.s-image (main image)
              OR div#altImages img (all images)
```

**Key Notes:**
- Use JavaScript execution for dynamic content
- Price may have decimals in separate spans
- Availability text: "In Stock", "Out of Stock", "More Buying Choices"

---

## 2. ACADEMY.COM

```
TITLE:        <title> tag OR h1[data-auid="title"]
PRICE:        span[class*="price"] (search for class containing 'price')
              Look for numeric value in these spans
AVAILABILITY: div[class*="availability"] OR span[class*="stock"]
              Search for "In Stock" or "Out of Stock" text
IMAGE:        img[src*="academy.scene7.com"]
              Best: img with src containing "$pdp-gallery-ng$"
```

**Key Notes:**
- Use data-auid attributes - they're more stable than classes
- Classes are auto-generated (emotion/styled-components)
- Title available in meta tags: `<meta property="og:title" content="..."/>`
- Price and availability require JavaScript rendering

---

## 3. EBAY.COM

```
TITLE:        h1#itemTitle
              OR <meta property="og:title" content="..."/>
              OR <title> tag
PRICE:        span.notranslate.vi-VR-cvipPrice
              OR span[id*="prcIsum"]
              OR div.vi-VR-cvipPrice
AVAILABILITY: span[class*="vi-acc-del-range"]
              OR search for "Out of stock" / "Available" text
              Look for quantity information
IMAGE:        img#vi_main (main large image)
              OR img.vi-img (any image in set)
              OR all img[src*="ebayimg"]
```

**Key Notes:**
- Multiple prices possible (start bid, current bid, Buy It Now)
- Auction vs. Fixed Price have different layouts
- Images hosted on ebayimg.com and ebaystatic.com
- Availability tied to auction/purchase status

---

## 4. MERCADOLIBRE.com.mx

```
TITLE:        h1[class*="title"]
              OR <script type="application/ld+json"> → "name" field
PRICE:        span[class*="price"]
              OR <script type="application/ld+json"> → "price" field
              Look for strikethrough (original) vs normal (current)
AVAILABILITY: span[class*="stock"]
              OR <script type="application/ld+json"> → "availability" field
              Text: "En stock", "Sin existencias", etc.
IMAGE:        img[class*="product-image"]
              OR <script type="application/ld+json"> → "image" field
              OR img[src*="mlstatic.com"]
```

**Key Notes:**
- Use JSON-LD structured data (most reliable)
- Classes are auto-generated - use text search when possible
- Different text in Spanish/other languages
- Heavy JavaScript rendering required
- Discount information often shown separately

---

## UNIVERSAL EXTRACTION METHODS

### Method 1: Meta Tags (Fastest)
```html
<title>Product Name | Site</title>
<meta property="og:image" content="URL"/>
<meta property="og:price:amount" content="99.99"/>
<meta name="description" content="Product details"/>
```

### Method 2: Structured Data (Most Reliable)
```html
<script type="application/ld+json">
{
  "@type": "Product",
  "name": "...",
  "image": "...",
  "offers": {
    "price": "...",
    "availability": "...",
    "url": "..."
  }
}
</script>
```

### Method 3: Direct Selectors (Custom per site)
See specific site sections above

---

## SELECTOR TEST COMMANDS

### Test in Browser Console:
```javascript
// Test if selector exists
console.log(document.querySelector('span#productTitle'));

// Get text content
console.log(document.querySelector('span#productTitle')?.textContent.trim());

// Find all matching elements
console.log(document.querySelectorAll('span[class*="price"]'));

// Get attribute value
console.log(document.querySelector('img#vi_main').src);
```

### Test with Node.js (jsdom):
```javascript
const { JSDOM } = require('jsdom');
const dom = new JSDOM(htmlString);
const title = dom.window.document.querySelector('h1');
console.log(title.textContent);
```

---

## FALLBACK STRATEGY (Recommended)

For each field, try selectors in this order:

### Title
1. Specific ID selector (e.g., `#productTitle`, `#itemTitle`)
2. Data attribute selector (e.g., `[data-auid="title"]`)
3. Meta tag from head
4. First `<h1>` element
5. Page `<title>` element

### Price
1. Specific price selector by site
2. Selector containing "price" in class name
3. JSON-LD structured data
4. Meta tag with price
5. Text search for currency symbol + number

### Availability
1. Specific availability/stock selector
2. Search text for common keywords
3. JSON-LD availability field
4. Button/link state (enabled = in stock)
5. CSS color indicators (green = in stock, red = out)

### Image
1. Specific product image selector
2. Meta property="og:image"
3. JSON-LD image field
4. First image in main content area
5. Largest image by dimensions

---

## SPECIAL CASES

### Amazon
- **Dynamic pricing**: May show different prices for logged-in users
- **Regional content**: Prices/availability vary by region
- **Multiple formats**: Different class names for different product types

### eBay
- **Auction items**: Different structure than fixed-price
- **Multiple variations**: Selector options change based on item type
- **Currency formatting**: Depends on user location

### Mercado Libre
- **Language variations**: Spanish/Portuguese/other languages
- **Regional pricing**: Prices in local currency
- **Sponsored products**: May have different selectors

### Academy Sports
- **React-heavy**: Most content loaded client-side
- **Stock limiting**: Real-time availability can change
- **Price variants**: Size/color may affect price

---

## PERFORMANCE TIPS

1. **Cache selectors**: Store successful selectors for reuse
2. **Use IDs first**: ID selectors are fastest
3. **Minimize DOM traversal**: Use direct CSS selectors over JavaScript loops
4. **Wait strategies**: 
   - Puppeteer: `waitForSelector()`
   - Selenium: `WebDriverWait` + expected_conditions
5. **Parallel extraction**: Extract multiple fields at once

---

## MAINTENANCE CHECKLIST

- [ ] Test selectors monthly (sites update HTML)
- [ ] Log failed selector attempts
- [ ] Keep fallback selectors updated
- [ ] Monitor site structure changes
- [ ] Version control selector changes
- [ ] Document site-specific quirks
