import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HiCheckCircle, HiTruck, HiXCircle, HiClipboardCopy } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { orderAPI } from '../../services/api';
import { formatDateTime } from '../../utils/helpers';

const STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

// Polling interval while a customer has an order's tracking panel open —
// there's no websocket/push infrastructure in this app, so this is what
// "real-time" means here: the panel quietly re-fetches often enough that a
// status change made in the admin panel (e.g. marking an order "shipped")
// shows up here within a few seconds without the customer refreshing.
const POLL_INTERVAL_MS = 8000;

export default function OrderTracking({ orderId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['orderTracking', orderId],
    queryFn: () => orderAPI.getOne(orderId),
    enabled: !!orderId,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const order = data?.data?.order;

  if (isLoading || !order) {
    return (
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const currentIndex = STEPS.findIndex((s) => s.key === order.status);

  const copyTracking = () => {
    navigator.clipboard.writeText(order.tracking_number);
    toast.success('Tracking number copied');
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="border-t border-theme-border/60 mt-4 pt-4 space-y-4">
        {isCancelled ? (
          <div className="flex items-center gap-2 text-danger text-sm">
            <HiXCircle className="w-5 h-5 flex-shrink-0" />
            <span className="capitalize">This order was {order.status}.</span>
          </div>
        ) : (
          <div className="flex items-start justify-between overflow-x-auto pb-1">
            {STEPS.map((step, i) => {
              const done = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center text-center min-w-[64px] relative">
                  {i > 0 && (
                    <div
                      className={`absolute top-2.5 right-1/2 w-full h-0.5 ${i <= currentIndex ? 'bg-gold' : 'bg-gray-700'}`}
                      style={{ zIndex: 0 }}
                    />
                  )}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center relative z-10 ${
                      done ? 'bg-gold text-black' : 'bg-gray-700 text-gray-500'
                    } ${isCurrent ? 'ring-4 ring-gold/20' : ''}`}
                  >
                    {done && <HiCheckCircle className="w-4 h-4" />}
                  </div>
                  <span className={`text-[11px] mt-2 ${done ? 'text-theme-text' : 'text-theme-muted opacity-60'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {order.tracking_number && (
          <div className="flex items-center gap-2 bg-noir/40 border border-theme-border/60 rounded-lg px-3 py-2 text-sm">
            <HiTruck className="w-4 h-4 text-gold flex-shrink-0" />
            <span className="text-theme-muted">{order.tracking_carrier ? `${order.tracking_carrier} · ` : ''}Tracking number:</span>
            <span className="text-theme-text font-mono">{order.tracking_number}</span>
            {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-gold hover:underline text-xs">Track shipment</a>}
            <button
              type="button"
              onClick={copyTracking}
              className="ml-auto text-gold hover:opacity-70 transition-opacity flex-shrink-0"
              aria-label="Copy tracking number"
            >
              <HiClipboardCopy className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-[11px] text-theme-muted opacity-60">
          Last updated {formatDateTime(order.updated_at || order.created_at)} · this panel refreshes automatically
        </p>
      </div>
    </motion.div>
  );
}
