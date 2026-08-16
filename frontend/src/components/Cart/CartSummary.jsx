import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiTag, HiX, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import useCartStore from '../../store/cartStore';
import { formatPrice } from '../../utils/helpers';
import { settingsAPI } from '../../services/api';

export default function CartSummary({ showCoupon = true }) {
  const { items, getCartTotal, appliedCoupon, couponDiscount, applyCoupon, removeCoupon } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const shippingRate = settings.shipping_flat_rate !== undefined ? Number(settings.shipping_flat_rate) : (settings.shipping_rate !== undefined ? Number(settings.shipping_rate) : 200);
  const freeShippingThreshold = settings.shipping_free_threshold !== undefined
    ? Number(settings.shipping_free_threshold) : (settings.free_shipping_threshold !== undefined ? Number(settings.free_shipping_threshold) : 5000);

  const subtotal = getCartTotal();
  const shipping = subtotal >= freeShippingThreshold ? 0 : subtotal > 0 ? shippingRate : 0;
  const discount = couponDiscount || 0;
  const total = subtotal - discount + shipping;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplying(true);
    const result = await applyCoupon(couponCode);
    setIsApplying(false);
    if (result.success) {
      toast.success(result.message);
      setCouponCode('');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="text-theme-muted">Subtotal ({items.reduce((c, i) => c + i.quantity, 0)} items)</span>
        <span className="text-theme-text">{formatPrice(subtotal)}</span>
      </div>

      {discount > 0 && (
        <div className="flex justify-between text-success">
          <span className="flex items-center gap-1">
            <HiTag className="w-3.5 h-3.5" />
            Discount ({appliedCoupon?.code})
          </span>
          <span>-{formatPrice(discount)}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-theme-muted">Shipping</span>
        <span className={shipping === 0 && subtotal > 0 ? 'text-success' : 'text-theme-text'}>
          {subtotal === 0 ? formatPrice(0) : shipping === 0 ? 'Free' : formatPrice(shipping)}
        </span>
      </div>

      {subtotal < freeShippingThreshold && subtotal > 0 && (
        <p className="text-xs text-theme-muted opacity-70">
          Add {formatPrice(freeShippingThreshold - subtotal)} more for free shipping
        </p>
      )}

      <div className="flex justify-between pt-3 border-t border-gold/10">
        <span className="font-bold">Total</span>
        <span className="font-bold text-gold text-lg">{formatPrice(total)}</span>
      </div>

      {/* Coupon Code Section */}
      {showCoupon && (
        <div className="pt-3 border-t border-gold/10">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <HiCheck className="w-4 h-4 text-success" />
                <span className="text-success text-xs font-montserrat font-medium">
                  {appliedCoupon.code} applied
                </span>
              </div>
              <button
                onClick={removeCoupon}
                className="text-theme-muted hover:text-danger transition-colors"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <HiTag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted opacity-60" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Coupon code"
                  className="w-full bg-theme-bg border border-theme-border rounded-lg pl-9 pr-3 py-2 text-theme-text text-xs focus:border-theme-primary outline-none placeholder-theme-muted/50 transition-colors"
                />
              </div>
              <button
                onClick={handleApplyCoupon}
                disabled={isApplying || !couponCode.trim()}
                className="px-3 py-2 bg-gold/10 border border-gold/30 text-gold text-xs rounded-lg hover:bg-gold hover:text-theme-bg transition-all disabled:opacity-50 font-montserrat whitespace-nowrap"
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
