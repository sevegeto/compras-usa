# CSS SELECTORS FOR PRODUCT INFORMATION EXTRACTION

## Executive Summary
Analysis of 4 major e-commerce platforms with CSS selector recommendations for extracting:
- Product Title/Name
- Product Price
- Product Availability/Stock Status
- Product Image

---

## 1. AMAZON (https://www.amazon.com/dp/B00P5CEJ46)

### Platform Characteristics
- **Technology**: Heavy JavaScript/React-based rendering
- **Content Loading**: Dynamic (requires JavaScript execution)
- **Class Naming**: Highly obfuscated; uses single-letter classes (a-*)
- **Stability**: Classes change frequently; IDs are more stable

### CSS Selectors by Field

#### Product Title/Name
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span#productTitle` | `h1.product-title` | `div[data-feature-name="title"] span` |
| Recommended approach: Use ID when available | Check for h1 elements | Look for title in data attributes |

#### Product Price
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span.a-price-whole` | `div#priceblock_dealprice` | `span.a-price-fraction` |
| `span.a-price.a-text-price` | `.apexPriceToPay` | `span[class*="a-price"]` |

**Note**: Amazon often displays price as:
```html
<span class="a-price-whole">$XX</span>
<span class="a-price-fraction">.XX</span>
```

#### Product Availability/Stock Status
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `div#availability span` | `span.availability` | `span[class*="in-stock"]` |
| Look for text: "In Stock", "Out of Stock" | `div#av-" attributes | Amazon-specific status messages |

#### Product Image
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `img#landingImage` | `img.s-image` | `img.a-dynamic-image` |
| `div#altImages img` | `img[src*="images-amazon"]` | First `<img>` in gallery |

**Best Practice**: Get high-res image from `srcset` attribute or look for `s-l1600.jpg` in src

---

## 2. ACADEMY.COM (https://www.academy.com/p/magellan-outdoors-camo-day-pack)

### Platform Characteristics
- **Technology**: Modern React/Next.js
- **Content Loading**: Server-side rendered + client-side hydration
- **Class Naming**: CSS-in-JS (emotion/styled-components) - generated hashes
- **Data Attributes**: Uses `data-auid` for stable identification
- **Stability**: Data attributes are more reliable than classes

### CSS Selectors by Field

#### Product Title/Name
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `h1[data-auid="title"]` | `title` (meta tag) | `span[class*="product-name"]` |
| Extract from: `<title>` tag in head | Look in `og:title` meta property | Find h1 with title content |

**Meta Tag Approach** (Most Reliable):
```html
<title data-auid="title">Magellan Outdoors Camo Day Pack | Academy</title>
<meta data-auid="og:title" property="og:title" content="..."/>
```

#### Product Price
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span[class*="price"]` | `div.price-display` | `span.original-price, span.current-price` |
| Look for: `class` containing "price" | Find price in main content area | Check discounted vs original |

**Pattern**: Academy typically shows:
```html
<span class="[hash]-price">[PRICE]</span>
```

#### Product Availability/Stock Status
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `div[class*="availability"]` | `span[class*="stock"]` | Look for "In Stock" / "Out of Stock" text |
| Text content search | Near pricing section | Button state (enabled/disabled) |

#### Product Image
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `img[src*="academy.scene7.com"]` | `img.product-image` | First image in gallery |
| **Attribute**: `$pdp-gallery-ng$` | Check srcset | `picture` element with sources |

**Recommended**: Look for image with `$pdp-gallery-ng$` parameter for full-size version

---

## 3. EBAY.COM (https://www.ebay.com/itm/136817975878?var=435369828258)

### Platform Characteristics
- **Technology**: Hybrid - Server-rendered with JavaScript enhancement
- **Content Loading**: Mixed (initial HTML + AJAX updates)
- **Class Naming**: Legacy classes mixed with modern naming; complex nesting
- **Dynamic Elements**: Price, availability updated via JavaScript
- **Variations**: Auction vs Buy It Now pricing differs

### CSS Selectors by Field

#### Product Title/Name
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `h1#itemTitle` | `h1[class*="title"]` | `meta[property="og:title"]` |
| Check for: ID-based selection | Class-based fallback | Use meta tag from head |

**From HTML**: 
```html
<title>Ruger10/22 Muzzle Brake Adapter ... | eBay</title>
<meta Property="og:title" Content="Ruger10/22 Muzzle Brake Adapter ..."/>
```

#### Product Price
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span.notranslate.vi-VR-cvipPrice` | `span[id*="prcIsum"]` | `div.vi-VR-cvipPrice` |
| Look for: `class*="price"` | Search by ID pattern | Find in JavaScript data object |

**Note**: eBay price format often includes currency symbol and may have multiple prices (start/current/bin)

#### Product Availability/Stock Status
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span[class*="vi-acc-del-range"]` | `div[class*="availability"]` | Search text for "Available", "Sold" |
| Look for shipping info | Quantity tracking | Item status text |

**Variations**:
- Auction: Shows current bid, quantity available
- Buy It Now: Shows "Add to cart" status
- Out of stock: Shows "Out of stock" text

#### Product Image
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `img#vi_main` | `img.vi-img` | `img[src*="ebayimg"]` |
| Main product image | Thumbnail gallery | All images in carousel |

**URL Pattern**: Images hosted on `i.ebayimg.com` or `thumbs.ebaystatic.com`

---

## 4. MERCADOLIBRE.com.mx (https://www.mercadolibre.com.mx/...)

### Platform Characteristics
- **Technology**: React/Next.js with heavy client-side rendering
- **Content Loading**: Dynamic - most content loaded via JavaScript
- **Class Naming**: Auto-generated classes from CSS-in-JS
- **Data Structure**: JSON-LD schema often contains complete data
- **Localization**: Supports multiple countries/languages

### CSS Selectors by Field

#### Product Title/Name
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `h1[class*="title"]` | `h1.product-title` | JSON-LD script `schema.org/Product` |
| Text content inside h1 | Look in product heading | Parse `<script type="application/ld+json">` |

**Most Reliable**: Extract from JSON-LD structured data:
```html
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"Product",
  "name":"[PRODUCT TITLE]",
  ...
}
</script>
```

#### Product Price
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span.price-tag` | `span[class*="price"]` | `div.price-box span` |
| Main price display | Look for number formatting | Check for discount/offer |

**Format**: Often shows:
- Current price (highlighted)
- Original price (strikethrough)
- Discount percentage

#### Product Availability/Stock Status
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `span[class*="stock"]` | `div[class*="availability"]` | JSON-LD `availability` field |
| Look for: "In Stock", "Sin existencias" | Availability message | Parse structured data |

#### Product Image
| Primary | Fallback | Alternative |
|---------|----------|-------------|
| `img.product-image` | `img[class*="gallery"]` | `picture > source[srcset]` |
| First large product image | Gallery thumbnails | Modern picture element |

**URL Pattern**: Hosted on `http2.mlstatic.com` or `img.mercadolibre.com`

---

## UNIVERSAL STRATEGIES

### 1. **Use Structured Data (JSON-LD)**
Most modern e-commerce sites include Schema.org data:
```javascript
// Extract from script tag
document.querySelector('script[type="application/ld+json"]')
  .textContent // Parse JSON to get structured product data
```

### 2. **Meta Tags as Fallback**
Always present in head for SEO:
```html
<meta name="description" content="..."/> <!-- May contain title/details -->
<meta property="og:image" content="..."/> <!-- Product image URL -->
<meta property="og:title" content="..."/> <!-- Product title -->
<meta property="og:price:amount" content="..."/> <!-- Sometimes includes price -->
```

### 3. **Look for Data Attributes**
More stable than classes:
```css
[data-auid], [data-testid], [data-product], [data-price]
```

### 4. **Text Content Search**
For visibility/availability:
```javascript
// Search for common text patterns
const text = document.body.innerText;
const inStock = /in stock|en stock|available|disponible/i.test(text);
```

### 5. **Image Extraction**
Prefer these approaches (in order):
1. `<img>` tags with `src` or `srcset`
2. `<picture>` elements with `<source>` tags
3. CSS background images (parse from inline styles)
4. Data attributes containing image URLs

---

## IMPLEMENTATION TIPS

### Headless Browser Setup (Recommended)
```javascript
// Use Puppeteer, Playwright, or Selenium for dynamic content
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle2' });
// Now querySelector will find rendered content
```

### Robust Selector Pattern
```javascript
const getProductInfo = (doc) => {
  const title = 
    doc.querySelector('h1[data-auid="title"]')?.innerText ||
    doc.querySelector('h1#itemTitle')?.innerText ||
    doc.querySelector('title')?.innerText ||
    doc.querySelector('meta[property="og:title"]')?.content;
    
  // Price selector...
  // Availability selector...
  // Image selector...
  
  return { title, price, availability, image };
};
```

### Error Handling
```javascript
try {
  const selector = 'span#productTitle';
  const element = document.querySelector(selector);
  const value = element?.innerText || element?.textContent || '';
  return value.trim();
} catch (error) {
  console.error(`Failed to extract from ${selector}:`, error);
  return null; // Fall back to next selector
}
```

---

## TESTING SELECTORS

### Browser Console Testing
```javascript
// Test selector in browser console
document.querySelectorAll('span[class*="price"]').forEach(el => 
  console.log(el.textContent)
);

// Get computed styles
const style = window.getComputedStyle(document.querySelector('h1'));
console.log(style.fontSize, style.color);
```

### Python Extraction (with Selenium)
```python
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get(url)
driver.implicitly_wait(10)

title = driver.find_element(By.CSS_SELECTOR, 'span#productTitle').text
price = driver.find_element(By.CSS_SELECTOR, 'span.a-price-whole').text
```

---

## FINAL RECOMMENDATIONS BY USE CASE

### **Fastest (If structure is stable)**
Use simple ID/class selectors + text search

### **Most Reliable (If content is dynamic)**
1. Use headless browser to wait for JavaScript
2. Parse JSON-LD structured data
3. Fall back to meta tags
4. Last resort: complex CSS selectors

### **Most Maintainable**
1. Use data attributes (data-auid, data-testid)
2. Use semantic HTML selectors (h1, img, etc.)
3. Avoid auto-generated class names
4. Store multiple selectors for each field

### **Best Performance**
1. Execute custom JavaScript in browser
2. Use querySelector over querySelectorAll when possible
3. Cache DOM selections
4. Extract multiple fields in single browser execution

---

## References
- [Schema.org Product Type](https://schema.org/Product)
- [CSS Selectors MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Web Scraping Best Practices](https://www.cloudflare.com/learning/bots/web-scraping/)
