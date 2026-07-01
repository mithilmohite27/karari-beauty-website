# Karari Beauty Website

Premium Phase 1 website for Karari Beauty with a normal boutique product showcase and a configurable Raksha Bandhan 2026 seasonal homepage.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project Structure

- `app/` - Next.js app routes, metadata and global styles.
- `components/HomeExperience.jsx` - Homepage, seasonal campaign UI, product cards, quick view, WhatsApp widget and sections.
- `data/businessSettings.js` - Business name, WhatsApp number, social handles, UPI placeholder and international messaging.
- `data/categories.js` - Main category showcase data.
- `data/products.js` - Local dummy product catalog.
- `data/seasonalCampaign.js` - Campaign activation and Raksha Bandhan 2026 settings.
- `data/giftCombos.js` - Gift combo and hamper data.
- `data/frequentlyBoughtTogether.js` - Frequently bought together product groups.
- `lib/whatsapp.js` - WhatsApp inquiry URL generator and currency formatter.
- `public/logo.png` - Karari Beauty logo asset.

## Dummy Products

Products are stored in `data/products.js`. Replace the placeholder names, prices, descriptions, SKUs and image URLs when the client shares real product details.

## Change WhatsApp Number

Update `whatsappNumber` in `data/businessSettings.js`.

Use the full country-code number without `+`, spaces or dashes:

```js
whatsappNumber: "919999999999"
```

## Turn Seasonal Campaign On or Off

Update `active` in `data/seasonalCampaign.js`.

```js
active: true
```

Set it to `false` to show the normal Karari Beauty homepage.

## Phase 1 Scope

Included:

- Premium responsive homepage.
- Normal product showcase categories.
- Raksha Bandhan 2026 seasonal homepage.
- Countdown to 28 August 2026.
- Soft Rakhi thread animation.
- Featured Rakhi products.
- Gift combos and premium hampers.
- Price collection chips.
- Frequently bought together UI.
- Product quick-view modal.
- WhatsApp inquiry URL flow.
- Floating WhatsApp chat widget.
- UPI/GPay placeholder messaging.
- International inquiry messaging.

Not included yet:

- Payment gateway.
- Real AI assistant.
- CMS/admin panel.
- Customer login.
- Ecommerce cart and checkout.

## Phase 2 Suggestions

- Add admin panel or CMS for products, prices, inventory and campaign scheduling.
- Add real product photography and optimized local image assets.
- Add enquiry tracking for WhatsApp leads.
- Add campaign auto-activation by date range.
- Add SEO collection pages for every category.
- Add analytics events for product view and inquiry clicks.
- Add payment collection only after the business workflow is finalized.
