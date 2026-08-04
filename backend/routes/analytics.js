const express = require('express');
const { query } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [
      revenue, orders, customers, products,
      recentOrders, lowStock, recentReviews,
      todayOrders, monthlyOrders, ordersByStatus,
      recentCustomers, pendingReviews,
    ] = await Promise.all([
      query("SELECT COALESCE(SUM(total_amount),0) AS total FROM orders WHERE status NOT IN ('cancelled','refunded')"),
      query("SELECT COUNT(*) FROM orders"),
      query("SELECT COUNT(*) FROM users WHERE role='customer'"),
      query("SELECT COUNT(*) FROM products WHERE is_visible=true"),
      query(`SELECT o.id, o.total_amount, o.status, o.created_at, u.first_name, u.last_name FROM orders o LEFT JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT 8`),
      query(`SELECT p.name, pv.size_ml, pv.quantity, pv.sku FROM product_variants pv JOIN products p ON pv.product_id=p.id WHERE pv.quantity <= 10 AND pv.is_active=true ORDER BY pv.quantity ASC LIMIT 8`),
      query(`SELECT r.*, p.name as product_name FROM reviews r JOIN products p ON r.product_id=p.id WHERE r.is_approved=false ORDER BY r.created_at DESC LIMIT 5`),
      query(`SELECT COUNT(*) FROM orders WHERE DATE_TRUNC('day', created_at) = CURRENT_DATE`),
      query(`SELECT COUNT(*) FROM orders WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC`),
      query(`SELECT id, first_name, last_name, email, created_at FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT 6`),
      query(`SELECT COUNT(*) FROM reviews WHERE is_approved=false`),
    ]);

    // Weekly sales data
    const salesData = await query(`
      SELECT DATE_TRUNC('day', created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount),0) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND status NOT IN ('cancelled','refunded')
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `);

    // Monthly sales
    const monthlySales = await query(`
      SELECT DATE_TRUNC('month', created_at) as month,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount),0) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
        AND status NOT IN ('cancelled','refunded')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    // Top products
    const topProducts = await query(`
      SELECT p.id, p.name, p.slug, SUM(oi.quantity) as sold, SUM(oi.subtotal) as revenue,
        (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) as image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled','refunded')
      GROUP BY p.id, p.name, p.slug
      ORDER BY sold DESC
      LIMIT 5
    `);

    // Build order status map
    const statusMap = {};
    ordersByStatus.rows.forEach((r) => { statusMap[r.status] = parseInt(r.count); });

    res.json({
      revenue: `₨${parseFloat(revenue.rows[0].total).toLocaleString()}`,
      revenueRaw: parseFloat(revenue.rows[0].total),
      orders: parseInt(orders.rows[0].count),
      customers: parseInt(customers.rows[0].count),
      products: parseInt(products.rows[0].count),
      todayOrders: parseInt(todayOrders.rows[0].count),
      monthlyOrders: parseInt(monthlyOrders.rows[0].count),
      pendingOrders: (statusMap['pending'] || 0) + (statusMap['processing'] || 0),
      completedOrders: (statusMap['delivered'] || 0) + (statusMap['completed'] || 0),
      cancelledOrders: statusMap['cancelled'] || 0,
      pendingReviews: parseInt(pendingReviews.rows[0].count),
      recentOrders: recentOrders.rows,
      recentCustomers: recentCustomers.rows,
      lowStock: lowStock.rows,
      recentReviews: recentReviews.rows,
      salesData: salesData.rows,
      monthlySales: monthlySales.rows,
      topProducts: topProducts.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/analytics/sales
router.get('/sales', requireAdmin, async (req, res) => {
  try {
    // Accept both 'week/month/year' (frontend) and 'weekly/monthly/yearly' (legacy)
    const rawPeriod = req.query.period || 'weekly';
    const periodMap = { week: 'weekly', month: 'monthly', year: 'yearly' };
    const period = periodMap[rawPeriod] || rawPeriod;

    const intervals = { daily: '24 hours', weekly: '7 days', monthly: '30 days', yearly: '365 days' };
    const truncs = { daily: 'hour', weekly: 'day', monthly: 'week', yearly: 'month' };

    const trunc = truncs[period] || 'day';
    const interval = intervals[period] || '7 days';

    const [salesResult, statsResult, topProductsResult] = await Promise.all([
      query(`
        SELECT DATE_TRUNC('${trunc}', created_at) as date,
          COUNT(*) as orders, COALESCE(SUM(total_amount),0) as revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${interval}'
          AND status NOT IN ('cancelled','refunded')
        GROUP BY 1 ORDER BY 1 ASC
      `),
      query(`
        SELECT
          COALESCE(SUM(total_amount),0) as revenue,
          COUNT(*) as orders,
          (SELECT COUNT(DISTINCT user_id) FROM orders
           WHERE created_at >= NOW() - INTERVAL '${interval}'
             AND status NOT IN ('cancelled','refunded') AND user_id IS NOT NULL) as customers
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '${interval}'
          AND status NOT IN ('cancelled','refunded')
      `),
      query(`
        SELECT p.id, p.name, p.slug,
          SUM(oi.quantity) as sold,
          COALESCE(SUM(oi.subtotal),0) as revenue,
          (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) as image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= NOW() - INTERVAL '${interval}'
          AND o.status NOT IN ('cancelled','refunded')
        GROUP BY p.id, p.name, p.slug
        ORDER BY sold DESC
        LIMIT 5
      `),
    ]);

    const s = statsResult.rows[0];
    res.json({
      salesData: salesResult.rows,
      stats: {
        revenue: parseFloat(s.revenue),
        orders: parseInt(s.orders),
        customers: parseInt(s.customers),
        conversionRate: 0,
      },
      topProducts: topProductsResult.rows,
      period,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// GET /api/analytics/inventory
router.get('/inventory', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.id, p.name, pv.size_ml, pv.sku, pv.quantity,
        CASE WHEN pv.quantity=0 THEN 'out_of_stock'
             WHEN pv.quantity<=10 THEN 'low'
             WHEN pv.quantity<=20 THEN 'moderate'
             ELSE 'high' END as stock_status
      FROM product_variants pv
      JOIN products p ON pv.product_id=p.id
      WHERE pv.is_active=true
      ORDER BY pv.quantity ASC
    `);
    res.json({ inventory: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

// POST /api/analytics/events
router.post('/events', async (req, res) => {
  try {
    const { event_type, product_id, metadata } = req.body;
    await query(
      'INSERT INTO analytics_events (event_type, product_id, metadata) VALUES ($1,$2,$3)',
      [event_type, product_id || null, JSON.stringify(metadata || {})]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track event' });
  }
});

module.exports = router;
