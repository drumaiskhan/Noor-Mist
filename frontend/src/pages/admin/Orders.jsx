import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderAPI } from '../../services/api';
import { 
  HiSearch, HiEye, HiTruck, HiCheck, HiX, HiClock,
  HiClipboardList, HiCurrencyDollar, HiUser, HiLocationMarker,
  HiPhone, HiMail, HiCube, HiArrowLeft, HiTrash, HiPrinter
} from 'react-icons/hi';
import { formatPrice, formatDateTime, formatDate } from '../../utils/helpers';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import toast from 'react-hot-toast';

function printInvoice(order) {
  const addr = order.shipping_address || {};
  const items = order.items || [];
  const subtotal = formatPrice(order.subtotal || 0);
  const shipping = formatPrice(order.shipping_cost || order.shipping_amount || 0);
  const discount = order.discount || order.discount_amount || 0;
  const total = formatPrice(order.total || order.total_amount || 0);

  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;">${item.product_name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${item.variant_size || ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;">${formatPrice(item.price || item.unit_price || 0)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;">${formatPrice((item.price || item.unit_price || 0) * item.quantity)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice — ${order.order_number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:40px;font-size:14px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #D4AF37;}
    .brand{font-size:28px;font-weight:700;color:#D4AF37;letter-spacing:1px;}
    .brand-sub{font-size:12px;color:#888;margin-top:4px;}
    .invoice-meta{text-align:right;}
    .invoice-meta h2{font-size:22px;font-weight:700;color:#111;margin-bottom:6px;}
    .invoice-meta p{font-size:12px;color:#666;line-height:1.6;}
    .section{margin-bottom:28px;}
    .section-title{font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#999;margin-bottom:10px;}
    .address-box{background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:14px;font-size:13px;line-height:1.7;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    thead th{background:#1a1a1a;color:#D4AF37;padding:10px 8px;text-align:left;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;}
    thead th:last-child,thead th:nth-child(4){text-align:right;}
    thead th:nth-child(2),thead th:nth-child(3){text-align:center;}
    .totals{margin-left:auto;width:280px;margin-top:24px;}
    .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #f0f0f0;}
    .totals-total{font-size:16px;font-weight:700;border-bottom:2px solid #D4AF37;border-top:2px solid #D4AF37;padding:10px 0;margin-top:4px;}
    .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#f0f0f0;text-transform:capitalize;}
    .footer{margin-top:60px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center;}
    @media print{body{padding:20px;}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Noor Mist</div>
      <div class="brand-sub">Where Luxury Meets Mystery</div>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>${order.order_number}</strong></p>
      <p>Date: ${new Date(order.created_at).toLocaleDateString('en-PK',{year:'numeric',month:'long',day:'numeric'})}</p>
      <p>Status: <span class="status-badge">${order.status}</span></p>
      <p>Payment: ${order.payment_method || 'Cash on Delivery'}</p>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
    <div class="section">
      <div class="section-title">Customer</div>
      <div class="address-box">
        ${addr.firstName || ''} ${addr.lastName || ''}<br/>
        ${addr.email ? `${addr.email}<br/>` : ''}
        ${addr.phone ? `${addr.phone}<br/>` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Ship To</div>
      <div class="address-box">
        ${addr.firstName || ''} ${addr.lastName || ''}<br/>
        ${addr.address || ''}<br/>
        ${addr.city || ''}${addr.province ? ', ' + addr.province : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Items</div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align:center;">Size</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${subtotal}</span></div>
    <div class="totals-row"><span>Shipping</span><span>${shipping}</span></div>
    ${discount > 0 ? `<div class="totals-row"><span>Discount</span><span>-${formatPrice(discount)}</span></div>` : ''}
    <div class="totals-row totals-total"><span>Total</span><span>${total}</span></div>
  </div>

  ${order.notes ? `<div class="section" style="margin-top:32px;"><div class="section-title">Notes</div><p style="font-size:13px;color:#555;">${order.notes}</p></div>` : ''}

  <div class="footer">
    Thank you for shopping with Noor Mist. For inquiries contact us at contact@noormist.com
  </div>
  <script>window.onload=()=>{ window.print(); setTimeout(()=>window.close(),500); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  processing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  shipped: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  delivered: 'bg-green-500/10 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  refunded: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

const statusIcons = {
  pending: HiClock,
  confirmed: HiCheck,
  processing: HiCube,
  shipped: HiTruck,
  delivered: HiCheck,
  cancelled: HiX,
  refunded: HiCurrencyDollar,
};

const collectionTypes = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeCollection, setActiveCollection] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['adminOrders', search, statusFilter, page],
    queryFn: () => orderAPI.getAll({ 
      search, 
      status: statusFilter === 'all' ? '' : statusFilter, 
      page, 
      limit: 20 
    }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => orderAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminOrders']);
      toast.success('Order status updated successfully');
      if (selectedOrder) {
        setSelectedOrder(prev => ({ ...prev, status: statusFilter }));
      }
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => orderAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminOrders']);
      toast.success('Order deleted');
      setSelectedOrder(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete order'),
  });

  const handleDelete = (e, orderId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    deleteMutation.mutate(orderId);
  };

  const orders = data?.data?.orders || [];
  const totalPages = data?.data?.pages || 1;
  const totalOrders = data?.data?.total || 0;

  // Calculate collection counts
  const collectionCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, { all: totalOrders });

  const handleStatusChange = (orderId, newStatus) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Orders</h1>
          <p className="text-gray-400 text-sm">{totalOrders} total orders</p>
        </div>
      </div>

      {/* Collection Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {collectionTypes.map((collection) => (
          <button
            key={collection.value}
            onClick={() => {
              setActiveCollection(collection.value);
              setStatusFilter(collection.value);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-montserrat whitespace-nowrap transition-all ${
              activeCollection === collection.value
                ? 'bg-gold text-black font-semibold'
                : 'bg-noir-card text-gray-400 border border-gray-700 hover:border-gray-500'
            }`}
          >
            {collection.label}
            {collectionCounts[collection.value] > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeCollection === collection.value 
                  ? 'bg-black/20 text-black' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {collectionCounts[collection.value] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number, customer name, or phone..."
          className="w-full bg-noir border border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-white text-sm focus:border-gold outline-none"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="luxury-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="skeleton h-5 w-24 rounded" />
                <div className="skeleton h-5 w-20 rounded" />
              </div>
              <div className="flex gap-4">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <HiClipboardList className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-playfair font-bold mb-2">No Orders Found</h3>
            <p className="text-gray-400">
              {statusFilter !== 'all' 
                ? `No ${statusFilter} orders available` 
                : 'No orders have been placed yet'}
            </p>
          </div>
        ) : (
          orders.map((order, index) => {
            const StatusIcon = statusIcons[order.status] || HiClock;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="luxury-card p-5 hover:border-gold/30 transition-all cursor-pointer"
                onClick={() => viewOrderDetails(order)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-gold font-mono text-base font-bold">
                      {order.order_number}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${statusColors[order.status]}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <span className="text-gold font-bold text-lg">
                    {formatPrice(order.total)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <HiUser className="w-4 h-4 text-gray-500" />
                    <span>{order.customer_name || 'Guest Customer'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <HiCube className="w-4 h-4 text-gray-500" />
                    <span>{order.item_count || 0} items</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <HiClock className="w-4 h-4 text-gray-500" />
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <HiCurrencyDollar className="w-4 h-4 text-gray-500" />
                    <span>{order.payment_method || 'COD'}</span>
                  </div>
                </div>

                {/* Quick Status Update + Delete */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
                  {ORDER_STATUSES.filter(s => s.value !== order.status).slice(0, 3).map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(order.id, status.value)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-gold hover:text-gold transition-all"
                      disabled={updateStatusMutation.isLoading}
                    >
                      Move to {status.label}
                    </button>
                  ))}
                  <button
                    onClick={(e) => handleDelete(e, order.id)}
                    className="ml-auto p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Delete order"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gold disabled:opacity-50"
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg text-sm font-montserrat transition-all ${
                page === i + 1
                  ? 'bg-gold text-black'
                  : 'border border-gray-700 text-gray-400 hover:border-gold'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-noir-light border border-gold/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gold mb-2 transition-colors"
                  >
                    <HiArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to Orders</span>
                  </button>
                  <h2 className="text-xl font-playfair font-bold">
                    Order {selectedOrder.order_number}
                  </h2>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${statusColors[selectedOrder.status]}`}>
                  {React.createElement(statusIcons[selectedOrder.status] || HiClock, { className: "w-4 h-4" })}
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Update */}
                <div>
                  <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider mb-3">
                    Update Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUSES.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusChange(selectedOrder.id, status.value)}
                        disabled={status.value === selectedOrder.status || updateStatusMutation.isLoading}
                        className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                          status.value === selectedOrder.status
                            ? statusColors[status.value] + ' cursor-default'
                            : 'border-gray-700 text-gray-400 hover:border-gold hover:text-gold'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider mb-3">
                    Customer Information
                  </h3>
                  <div className="luxury-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <HiUser className="w-4 h-4 text-gold" />
                      <span className="text-white">
                        {selectedOrder.customer_name || 
                          `${selectedOrder.shipping_address?.firstName || ''} ${selectedOrder.shipping_address?.lastName || ''}`}
                      </span>
                    </div>
                    {selectedOrder.shipping_address?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <HiMail className="w-4 h-4 text-gold" />
                        <span className="text-gray-300">{selectedOrder.shipping_address.email}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_address?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <HiPhone className="w-4 h-4 text-gold" />
                        <span className="text-gray-300">{selectedOrder.shipping_address.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.shipping_address && (
                  <div>
                    <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider mb-3">
                      Shipping Address
                    </h3>
                    <div className="luxury-card p-4">
                      <div className="flex items-start gap-2">
                        <HiLocationMarker className="w-4 h-4 text-gold mt-0.5" />
                        <p className="text-gray-300 text-sm">
                          {selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}<br />
                          {selectedOrder.shipping_address.address}<br />
                          {selectedOrder.shipping_address.city}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider mb-3">
                    Order Items ({selectedOrder.items?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-noir rounded-xl">
                        <img
                          src={item.product_image || '/placeholder.jpg'}
                          alt={item.product_name}
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.product_name}</p>
                          <p className="text-gray-400 text-xs">
                            {item.variant_size} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-gold text-sm font-bold">
                          {formatPrice(item.total_price || item.unit_price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider mb-3">
                    Order Summary
                  </h3>
                  <div className="luxury-card p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-white">{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Shipping</span>
                      <span className="text-white">{formatPrice(selectedOrder.shipping_cost || 0)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Discount</span>
                        <span className="text-green-400">-{formatPrice(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-gray-800">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-gold font-bold text-lg">{formatPrice(selectedOrder.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Payment Method</span>
                      <span className="text-gray-400">{selectedOrder.payment_method || 'Cash on Delivery'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Payment Status</span>
                      <span className={selectedOrder.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}>
                        {selectedOrder.payment_status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <h3 className="text-sm font-montserrat text-gray-400 uppercase tracking-wider mb-3">
                      Notes
                    </h3>
                    <div className="luxury-card p-4">
                      <p className="text-gray-300 text-sm">{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-800 flex gap-3">
                <button
                  onClick={() => printInvoice(selectedOrder)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gold/40 rounded-xl text-gold hover:bg-gold/10 transition-all text-sm font-montserrat"
                >
                  <HiPrinter className="w-4 h-4" />
                  Print Invoice
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 btn-outline-gold text-sm"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
