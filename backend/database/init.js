const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    console.log('Initializing database...');

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await query(schema);
    console.log('Schema created successfully');

    // ── Payment system migrations ──────────────────────────────────────────
    const paymentsSchema = fs.readFileSync(path.join(__dirname, 'payments_schema.sql'), 'utf8');
    await query(paymentsSchema);

    // Extend orders status check to include payment-specific statuses
    await query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check`);
    await query(`ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
      status IN ('pending','pending_payment','awaiting_verification','confirmed','processing','packed','shipped','delivered','cancelled','refunded')
    )`);

    // Seed default payment methods
    const defaultMethods = [
      { key: 'cod', label: 'Cash on Delivery', description: 'Pay when you receive your order', order: 1, enabled: true, requires_proof: false },
      { key: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank account transfer', order: 2, enabled: true, requires_proof: true },
      { key: 'easypaisa', label: 'EasyPaisa', description: 'Telenor mobile wallet payment', order: 3, enabled: false, requires_proof: true },
      { key: 'jazzcash', label: 'JazzCash', description: 'Jazz mobile wallet payment', order: 4, enabled: false, requires_proof: true },
      { key: 'sadapay', label: 'SadaPay', description: 'Digital payment via SadaPay', order: 5, enabled: false, requires_proof: true },
      { key: 'nayapay', label: 'NayaPay', description: 'Digital payment via NayaPay', order: 6, enabled: false, requires_proof: true },
      { key: 'raast', label: 'Raast', description: 'SBP instant payment system', order: 7, enabled: false, requires_proof: true },
      { key: 'card', label: 'Debit / Credit Card', description: 'Coming soon — card payments', order: 8, enabled: false, requires_proof: false },
    ];
    for (const m of defaultMethods) {
      await query(
        `INSERT INTO payment_methods (key, label, description, display_order, is_enabled, requires_proof)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (key) DO NOTHING`,
        [m.key, m.label, m.description, m.order, m.enabled, m.requires_proof]
      );
    }

    // Seed default digital wallets
    const defaultWallets = ['easypaisa', 'jazzcash', 'sadapay', 'nayapay', 'raast'];
    for (const type of defaultWallets) {
      await query(
        `INSERT INTO digital_wallets (type) VALUES ($1) ON CONFLICT (type) DO NOTHING`,
        [type]
      );
    }

    // Migration: add is_primary column to bank_accounts (for Bank Settings page)
    await query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false`);

    // Ensure media_library table exists (migration for existing DBs)
    await query(`CREATE TABLE IF NOT EXISTS media_library (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      public_id TEXT,
      filename VARCHAR(255),
      size INTEGER,
      mime_type VARCHAR(100),
      width INTEGER,
      height INTEGER,
      alt_text VARCHAR(255),
      tags TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    // Seed default page content if missing
    const pageDefaults = [
      ['page_about', JSON.stringify({
        heading: 'About Noor Mist',
        subheading: 'Where Luxury Meets Mystery',
        story: 'Noor Mist was born from a passion for the extraordinary. Our journey began with a simple belief: that fragrance is not just a scent, but an expression of identity, emotion, and memory.\n\nOur master perfumers travel the world to source the finest ingredients, from the rose fields of Bulgaria to the oud forests of Southeast Asia.',
        mission: 'To craft exceptional fragrances that evoke emotion and leave lasting impressions.',
        vision: 'To be the most loved luxury fragrance brand, celebrated for quality and artistry.',
        image: '',
        founded_year: '2020',
        team_size: '50+',
        countries: '25+',
      })],
      ['page_contact', JSON.stringify({
        heading: 'Contact Us',
        subheading: "We'd love to hear from you.",
        email: 'contact@noormist.com',
        phone: '+92 300 1234567',
        whatsapp: '+92 300 1234567',
        address: 'Lahore, Pakistan',
        hours: 'Mon–Sat: 9am – 6pm PKT',
        map_embed: '',
      })],
      ['page_faq', JSON.stringify([
        { q: 'What makes Noor Mist fragrances special?', a: 'Our fragrances are crafted using the finest ingredients sourced globally, blended by master perfumers with decades of experience.' },
        { q: 'How long do the fragrances last?', a: 'Longevity varies by concentration. Our Parfum lasts 8–12 hours, while Eau de Parfum lasts 6–8 hours.' },
        { q: 'Do you ship internationally?', a: 'Yes, we ship to over 50 countries worldwide. Shipping times vary by location.' },
        { q: 'What is your return policy?', a: 'We offer a 14-day return policy for unopened products in their original packaging.' },
        { q: 'Are your products authentic?', a: 'Absolutely. All Noor Mist products are 100% authentic and come with a certificate of authenticity.' },
        { q: 'How should I store my perfume?', a: 'Store in a cool, dark place away from direct sunlight and temperature fluctuations.' },
      ])],
      ['page_privacy', JSON.stringify({ heading: 'Privacy Policy', content: '<h2>Information We Collect</h2><p>We collect information you provide directly to us, such as when you create an account, place an order, or contact us for support.</p><h2>How We Use Information</h2><p>We use the information we collect to process orders, send transactional and promotional communications, and improve our services.</p><h2>Information Sharing</h2><p>We do not sell or share your personal information with third parties except as necessary to provide our services.</p><h2>Contact Us</h2><p>If you have any questions about this Privacy Policy, please contact us at privacy@noormist.com.</p>' })],
      ['page_refund', JSON.stringify({ heading: 'Refund Policy', content: '<h2>Returns</h2><p>We accept returns within 14 days of delivery for unopened products in their original packaging.</p><h2>Process</h2><p>To initiate a return, contact our support team with your order number and reason for return.</p><h2>Refunds</h2><p>Refunds are processed within 5–7 business days after we receive the returned item.</p><h2>Non-Returnable Items</h2><p>Opened perfumes, gift sets, and sale items cannot be returned.</p>' })],
      ['page_shipping_policy', JSON.stringify({ heading: 'Shipping Policy', content: '<h2>Processing Time</h2><p>Orders are processed within 1–2 business days.</p><h2>Domestic Shipping</h2><p>Standard delivery within Pakistan takes 3–5 business days. Express delivery is available for select cities.</p><h2>International Shipping</h2><p>We ship to 50+ countries. International delivery takes 7–14 business days.</p><h2>Free Shipping</h2><p>Enjoy free shipping on orders over ₨5,000 within Pakistan.</p>' })],
      ['page_terms', JSON.stringify({ heading: 'Terms & Conditions', content: '<h2>Acceptance</h2><p>By accessing and using Noor Mist, you accept and agree to be bound by these Terms and Conditions.</p><h2>Products</h2><p>All products are subject to availability. We reserve the right to discontinue any product at any time.</p><h2>Orders</h2><p>We reserve the right to refuse or cancel any order at our discretion.</p><h2>Pricing</h2><p>All prices are in Pakistani Rupees (PKR) and are subject to change without notice.</p>' })],
    ];
    for (const [key, value] of pageDefaults) {
      await query(
        'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING',
        [key, value]
      );
    }

    // Ensure status column exists on reviews (migration for existing DBs)
    await query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`);
    await query(`UPDATE reviews SET status = 'approved' WHERE is_approved = true AND status = 'pending'`);

    // Check if admin exists
    const adminCheck = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (!adminCheck.rows.length) {
      const hash = await bcrypt.hash('admin123', 12);
      await query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, 'admin')",
        ['admin@noormist.com', hash, 'Admin', 'Noor Mist']
      );
      console.log('Default admin created: admin@noormist.com / admin123');
    }

    // Seed homepage sections
    const sections = [
      { type: 'hero', title: 'Hero Banner', position: 1, data: { heading: 'Where Luxury\nMeets Mystery', highlight: 'Art of Luxury', subtitle: 'Noor Mist Collection', description: 'Experience the essence of elegance with Noor Mist. Each fragrance tells a story of mystery and sophistication, crafted for those who appreciate the extraordinary.', primaryButton: 'Explore Collection', primaryLink: '/shop', secondaryButton: 'Our Story', secondaryLink: '/about' } },
      { type: 'collections', title: 'Featured Collections', position: 2, data: { title: 'Our Collections', subtitle: 'Discover our carefully curated fragrance collections' } },
      { type: 'bestsellers', title: 'Best Sellers', position: 3, data: { title: 'Best Sellers', subtitle: 'Our most loved fragrances by customers' } },
      { type: 'new_arrivals', title: 'New Arrivals', position: 4, data: { title: 'New Arrivals', subtitle: 'Fresh from our atelier' } },
      { type: 'perfume_finder', title: 'Perfume Finder', position: 5, data: { title: 'Find Your Signature Scent', subtitle: 'Answer a few questions and discover your perfect fragrance' } },
      { type: 'brand_story', title: 'Brand Story', position: 6, data: { title: 'The Art of Perfumery', body: 'Noor Mist was born from a passion for luxury and the timeless art of perfumery. Each fragrance is a masterpiece, crafted with the rarest ingredients sourced from around the world.', image: 'https://images.unsplash.com/photo-1595535873420-a599195b3f4a?w=800&q=80' } },
      { type: 'testimonials', title: 'Testimonials', position: 7, data: { title: 'What Our Customers Say' } },
      { type: 'instagram', title: 'Instagram Feed', position: 8, data: { title: 'Follow Our Journey', handle: '@noormist' } },
      { type: 'newsletter', title: 'Newsletter', position: 9, data: { title: 'Join the Noor Mist Family', subtitle: 'Subscribe and receive 10% off your first order plus exclusive access to new launches.' } },
    ];

    for (const s of sections) {
      await query(
        `INSERT INTO homepage_sections (section_type, title, content_data, position, is_enabled)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (section_type) DO NOTHING`,
        [s.type, s.title, JSON.stringify(s.data), s.position]
      );
    }

    // Seed default theme
    const themeCheck = await query('SELECT id FROM themes LIMIT 1');
    if (!themeCheck.rows.length) {
      await query(
        `INSERT INTO themes (name, is_active, settings) VALUES ($1, true, $2)`,
        ['Golden Noir', JSON.stringify({
          primaryColor: '#D4AF37',
          secondaryColor: '#0A0A0A',
          accentColor: '#B8960C',
          backgroundColor: '#0A0A0A',
          surfaceColor: '#141414',
          cardColor: '#141414',
          textPrimary: '#FFFFFF',
          textSecondary: '#9CA3AF',
          borderColor: '#2A2A2A',
          fontHeading: 'Playfair Display',
          fontBody: 'Cormorant Garamond',
          fontButton: 'Montserrat',
          borderRadius: 8,
          themeMode: 'dark',
          glassEffect: true,
          animationsEnabled: true,
          shadowsEnabled: true,
        })]
      );
    }

    // Seed default settings
    const defaultSettings = [
      { key: 'site_name', value: 'Noor Mist' },
      { key: 'site_tagline', value: 'Where Luxury Meets Mystery' },
      { key: 'currency', value: '₨' },
      { key: 'shipping_free_threshold', value: '5000' },
      { key: 'shipping_rate', value: '300' },
      { key: 'low_stock_threshold', value: '10' },
      { key: 'moderate_stock_threshold', value: '20' },
    ];
    for (const s of defaultSettings) {
      await query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [s.key, s.value]
      );
    }

    // Seed welcome coupon
    await query(
      `INSERT INTO coupons (code, type, value, minimum_order, is_active)
       VALUES ('WELCOME10', 'percentage', 10, 0, true)
       ON CONFLICT (code) DO NOTHING`
    );

    // Seed sample products
    const prodCheck = await query('SELECT id FROM products LIMIT 1');
    if (!prodCheck.rows.length) {
      await seedSampleProducts();
    }

    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database init error:', error.message);
  }
}

async function seedSampleProducts() {
  const products = [
    {
      name: 'Royal Oud',
      brand: 'Noor Mist',
      fragrance_family: 'oud',
      concentration: 'parfum',
      gender: 'unisex',
      description: 'A majestic blend of rare Agarwood from Assam, dark resins, and aged sandalwood. Royal Oud commands presence with its rich, complex character that evolves beautifully over hours of wear.',
      short_description: 'Majestic Agarwood with dark resins and aged sandalwood.',
      top_notes: ['Saffron', 'Rose', 'Bergamot'],
      middle_notes: ['Oud', 'Sandalwood', 'Amber'],
      base_notes: ['Musk', 'Vetiver', 'Patchouli'],
      longevity: 'eternal',
      projection: 'enormous',
      season: ['winter', 'autumn'],
      occasion: ['luxury_event', 'wedding'],
      is_bestseller: true,
      is_featured: true,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    },
    {
      name: 'Midnight Rose',
      brand: 'Noor Mist',
      fragrance_family: 'floral',
      concentration: 'eau_de_parfum',
      gender: 'female',
      description: 'An enchanting floral bouquet of Turkish rose petals, jasmine, and warm musk. Perfect for romantic evenings and special occasions, this fragrance captures the essence of timeless femininity.',
      short_description: 'Enchanting Turkish rose with jasmine and warm musk.',
      top_notes: ['Bergamot', 'Pink Pepper', 'Lemon'],
      middle_notes: ['Rose', 'Jasmine', 'Iris'],
      base_notes: ['Musk', 'Amber', 'Sandalwood'],
      longevity: 'long_lasting',
      projection: 'moderate',
      season: ['spring', 'summer'],
      occasion: ['date', 'wedding'],
      is_new_arrival: true,
      is_featured: true,
      image: 'https://images.unsplash.com/photo-1595535873420-a599195b3f4a?w=800&q=80',
    },
    {
      name: 'Gold Elixir',
      brand: 'Noor Mist',
      fragrance_family: 'oriental',
      concentration: 'parfum',
      gender: 'male',
      description: 'A luxurious oriental composition of precious saffron, warm amber, and exotic woods. Gold Elixir embodies the essence of opulence and sophistication, leaving an unforgettable impression.',
      short_description: 'Luxurious saffron and amber with precious woods.',
      top_notes: ['Saffron', 'Cardamom', 'Grapefruit'],
      middle_notes: ['Amber', 'Oud', 'Rose'],
      base_notes: ['Musk', 'Sandalwood', 'Benzoin'],
      longevity: 'eternal',
      projection: 'strong',
      season: ['winter', 'autumn'],
      occasion: ['formal', 'luxury_event'],
      is_bestseller: true,
      is_limited_edition: true,
      is_featured: true,
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    },
    {
      name: 'Crystal Mist',
      brand: 'Noor Mist',
      fragrance_family: 'fresh',
      concentration: 'eau_de_parfum',
      gender: 'unisex',
      description: 'A crisp, invigorating blend of vibrant citrus, cool sea breeze, and light woods. Crystal Mist brings freshness and clarity to any moment, perfect for daily wear.',
      short_description: 'Crisp citrus and sea breeze with light woods.',
      top_notes: ['Lemon', 'Bergamot', 'Sea Salt'],
      middle_notes: ['Jasmine', 'Cedar', 'Iris'],
      base_notes: ['White Musk', 'Amber', 'Vetiver'],
      longevity: 'moderate',
      projection: 'moderate',
      season: ['summer', 'spring'],
      occasion: ['daily', 'office'],
      is_new_arrival: true,
      image: 'https://images.unsplash.com/photo-1587834685524-2ac8b5578f1b?w=800&q=80',
    },
    {
      name: 'Desert Sands',
      brand: 'Noor Mist',
      fragrance_family: 'woody',
      concentration: 'eau_de_parfum',
      gender: 'male',
      description: 'Inspired by the vast Arabian desert at dusk, this woody oriental fragrance combines rich sandalwood, warm amber, and exotic spices for a deeply evocative experience.',
      short_description: 'Sandalwood and amber with exotic Arabian spices.',
      top_notes: ['Cumin', 'Pepper', 'Cardamom'],
      middle_notes: ['Sandalwood', 'Amber', 'Rose'],
      base_notes: ['Musk', 'Labdanum', 'Oud'],
      longevity: 'long_lasting',
      projection: 'strong',
      season: ['winter', 'autumn'],
      occasion: ['formal', 'date'],
      is_bestseller: true,
      image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80',
    },
    {
      name: 'Pearl Essence',
      brand: 'Noor Mist',
      fragrance_family: 'floral',
      concentration: 'eau_de_parfum',
      gender: 'female',
      description: 'A delicate, powdery floral with notes of peony, soft iris, and warm vanilla. Pearl Essence is the embodiment of graceful femininity — subtle yet unforgettable.',
      short_description: 'Delicate peony and iris with warm vanilla.',
      top_notes: ['Peony', 'Pink Pepper', 'Bergamot'],
      middle_notes: ['Iris', 'Rose', 'Violet'],
      base_notes: ['Vanilla', 'Musk', 'Sandalwood'],
      longevity: 'long_lasting',
      projection: 'soft',
      season: ['spring', 'summer'],
      occasion: ['daily', 'date'],
      is_new_arrival: true,
      is_featured: true,
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=80',
    },
    {
      name: 'Noir Ambre',
      brand: 'Noor Mist',
      fragrance_family: 'oriental',
      concentration: 'parfum',
      gender: 'unisex',
      description: 'A deep, smoldering oriental with dark amber, black pepper, and vetiver. Noir Ambre is mysterious and commanding — a fragrance for those who leave a lasting impression.',
      short_description: 'Dark amber and black pepper with vetiver.',
      top_notes: ['Black Pepper', 'Cinnamon', 'Cardamom'],
      middle_notes: ['Amber', 'Labdanum', 'Rose'],
      base_notes: ['Vetiver', 'Oud', 'Musk'],
      longevity: 'eternal',
      projection: 'enormous',
      season: ['winter', 'autumn'],
      occasion: ['luxury_event', 'evening'],
      is_bestseller: true,
      is_limited_edition: true,
      image: 'https://images.unsplash.com/photo-1587360110297-13be27527c42?w=800&q=80',
    },
    {
      name: 'Saffron Sunrise',
      brand: 'Noor Mist',
      fragrance_family: 'spicy',
      concentration: 'eau_de_parfum',
      gender: 'unisex',
      description: 'A warm, golden spice composition inspired by the first light of dawn over the Arabian Peninsula. Precious saffron meets creamy rose and rich woods in this captivating fragrance.',
      short_description: 'Precious saffron with creamy rose and rich woods.',
      top_notes: ['Saffron', 'Bergamot', 'Nutmeg'],
      middle_notes: ['Rose', 'Jasmine', 'Amber'],
      base_notes: ['Sandalwood', 'Musk', 'Patchouli'],
      longevity: 'long_lasting',
      projection: 'moderate',
      season: ['winter', 'autumn', 'spring'],
      occasion: ['formal', 'luxury_event'],
      is_new_arrival: true,
      is_gift_set: true,
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
    },
  ];

  for (const p of products) {
    const slug = p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const result = await query(
      `INSERT INTO products (name, slug, brand, fragrance_family, concentration, gender, description, short_description,
        top_notes, middle_notes, base_notes, longevity, projection, season, occasion,
        is_featured, is_bestseller, is_new_arrival, is_limited_edition, is_gift_set, is_visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,true)
       RETURNING id`,
      [p.name, slug, p.brand, p.fragrance_family, p.concentration, p.gender,
       p.description, p.short_description,
       p.top_notes, p.middle_notes, p.base_notes, p.longevity, p.projection,
       p.season, p.occasion,
       p.is_featured || false,
       p.is_bestseller || false,
       p.is_new_arrival !== false,
       p.is_limited_edition || false,
       p.is_gift_set || false,
      ]
    );
    const productId = result.rows[0].id;

    // Add sample variants with realistic pricing
    const sizes = [
      { ml: 30, price: 3500, sale_price: null, qty: 50 },
      { ml: 50, price: 5500, sale_price: 4999, qty: 35 },
      { ml: 100, price: 9500, sale_price: 8499, qty: 20 },
    ];
    for (const v of sizes) {
      const sku = `${slug.toUpperCase().slice(0, 8)}-${v.ml}ML`;
      await query(
        `INSERT INTO product_variants (product_id, size_ml, price, sale_price, sku, quantity)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (sku) DO NOTHING`,
        [productId, v.ml, v.price, v.sale_price, sku, v.qty]
      );
    }

    // Add product image
    await query(
      `INSERT INTO product_images (product_id, url, alt_text, position, is_primary)
       VALUES ($1,$2,$3,0,true)`,
      [productId, p.image, p.name]
    );
  }
  console.log('Sample products seeded');
}

module.exports = { initDatabase };
