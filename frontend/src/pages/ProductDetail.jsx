import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  HiHeart, HiShare, HiStar, HiShoppingBag,
  HiChevronLeft, HiCheck, HiTruck, HiShieldCheck,
  HiArrowLeft,
} from 'react-icons/hi';
import { productAPI, reviewAPI, settingsAPI } from '../services/api';
import useCartStore from '../store/cartStore';
import useWishlistStore from '../store/wishlistStore';
import useAuthStore from '../store/authStore';
import ProductGallery from '../components/Product/ProductGallery';
import ProductNotes from '../components/Product/ProductNotes';
import ProductReviews from '../components/Product/ProductReviews';
import RelatedProducts from '../components/Product/RelatedProducts';
import SizeSelector from '../components/Product/SizeSelector';
import StickyBuyBar from '../components/Product/StickyBuyBar';
import Loader from '../components/UI/Loader';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import Rating from '../components/UI/Rating';
import {
  formatPrice, calculateDiscount, getStockStatus,
  formatDate, truncateText,
} from '../utils/helpers';
import { LONGEVITY_OPTIONS, PROJECTION_OPTIONS, CONCENTRATIONS } from '../utils/constants';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { slug } = useParams();
  const { user } = useAuthStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productAPI.getOne(slug),
    enabled: !!slug,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.settings || {};
    },
    staleTime: 5 * 60 * 1000,
  });
  const freeShippingThreshold = settingsData?.free_shipping_threshold !== undefined
    ? Number(settingsData.free_shipping_threshold) : 5000;

  const product = data?.data?.product;
  const related = data?.data?.related || [];
  const isWishlisted = product ? isInWishlist(product.id) : false;

  // Set default variant when product loads
  useEffect(() => {
    if (product?.variants?.length > 0 && !selectedVariant) {
      const inStock = product.variants.find((v) => v.quantity > 0);
      setSelectedVariant(inStock || product.variants[0]);
    }
  }, [product, selectedVariant]);

  if (isLoading) return <Loader />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-playfair font-bold mb-4">Product Not Found</h2>
          <p className="text-theme-muted mb-6">The product you're looking for doesn't exist.</p>
          <Link to="/shop" className="btn-gold">Browse Shop</Link>
        </div>
      </div>
    );
  }
  if (!product) return null;

  const discount = selectedVariant
    ? calculateDiscount(selectedVariant.price, selectedVariant.sale_price)
    : 0;
  const currentPrice = selectedVariant?.sale_price || selectedVariant?.price || 0;
  const stockStatus = getStockStatus(selectedVariant?.quantity || 0);
  const totalStock = product.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0;

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.quantity === 0) return;
    addToCart(product, selectedVariant, quantity);
    toast.success(`${product.name} (${selectedVariant.size_ml}ml) added to cart`);
  };

  const handleBuyNow = () => {
    if (!selectedVariant || selectedVariant.quantity === 0) return;
    addToCart(product, selectedVariant, quantity);
    window.location.href = '/checkout';
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: product.short_description || product.name,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <>
      <Helmet>
        <title>{product.meta_title || `${product.name} - Noor Mist`}</title>
        <meta name="description" content={product.meta_description || truncateText(product.description, 160)} />
      </Helmet>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-theme-muted hover:text-theme-primary transition-colors"
        >
          <HiArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 md:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ProductGallery
              images={product.images || []}
              videos={product.videos || []}
            />
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.is_new_arrival && <Badge variant="new">New Arrival</Badge>}
              {product.is_bestseller && <Badge variant="bestseller">Best Seller</Badge>}
              {product.is_limited_edition && <Badge variant="limited">Limited Edition</Badge>}
              {product.is_gift_set && <Badge variant="gift">Gift Set</Badge>}
              {discount > 0 && <Badge variant="sale">-{discount}% OFF</Badge>}
            </div>

            {/* Product Name */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-bold mb-2">
                {product.name}
              </h1>
              <p className="text-theme-muted text-lg font-cormorant">
                {product.fragrance_family} • {product.concentration?.replace(/_/g, ' ')}
              </p>
            </div>

            {/* Rating Summary */}
            {product.average_rating > 0 && (
              <button
                onClick={() => setActiveTab('reviews')}
                className="flex items-center gap-3 text-left"
              >
                <Rating value={product.average_rating} size="lg" />
                <span className="text-theme-muted text-sm">
                  {product.average_rating} ({product.review_count} reviews)
                </span>
              </button>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-gold text-3xl font-bold">
                {formatPrice(currentPrice)}
              </span>
              {selectedVariant?.sale_price && (
                <span className="text-theme-muted opacity-70 text-xl line-through">
                  {formatPrice(selectedVariant.price)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className={`flex items-center gap-2 ${stockStatus.class}`}>
              <span className={`w-2 h-2 rounded-full ${
                selectedVariant?.quantity === 0 ? 'bg-danger' :
                selectedVariant?.quantity <= 10 ? 'bg-danger' :
                selectedVariant?.quantity <= 20 ? 'bg-warning' :
                'bg-success'
              }`} />
              <span className="text-sm font-montserrat">{stockStatus.label}</span>
            </div>

            {/* Short Description */}
            <p className="text-theme-muted leading-relaxed">
              {product.short_description || truncateText(product.description, 200)}
            </p>

            {/* Size Selector */}
            <SizeSelector
              variants={product.variants || []}
              selected={selectedVariant}
              onSelect={(variant) => {
                setSelectedVariant(variant);
                setQuantity(1);
              }}
            />

            {/* Quantity Selector */}
            {selectedVariant && selectedVariant.quantity > 0 && (
              <div>
                <label className="text-sm text-theme-muted uppercase tracking-wider font-montserrat mb-3 block">
                  Quantity
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-theme-border rounded-lg text-theme-text hover:border-gold transition-colors"
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-montserrat text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedVariant.quantity, quantity + 1))}
                    className="w-10 h-10 border border-theme-border rounded-lg text-theme-text hover:border-gold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                variant="gold"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.quantity === 0}
                className="flex-1"
              >
                <HiShoppingBag className="w-5 h-5" />
                Add to Cart
              </Button>
              <Button
                variant="gold"
                size="lg"
                onClick={handleBuyNow}
                disabled={!selectedVariant || selectedVariant.quantity === 0}
                className="flex-1"
              >
                Buy Now
              </Button>
              <button
                onClick={() => toggleWishlist(product)}
                className={`p-4 rounded-xl border transition-all ${
                  isWishlisted
                    ? 'bg-gold/10 border-gold text-gold'
                    : 'border-theme-border text-theme-muted hover:border-gold hover:text-theme-primary'
                }`}
              >
                <HiHeart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-4 rounded-xl border border-theme-border text-theme-muted hover:border-gold hover:text-theme-primary transition-all"
              >
                <HiShare className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gold/10">
              <div className="flex items-center gap-2 text-sm text-theme-muted">
                <HiTruck className="w-5 h-5 text-gold" />
                Free Shipping over {formatPrice(freeShippingThreshold)}
              </div>
              <div className="flex items-center gap-2 text-sm text-theme-muted">
                <HiShieldCheck className="w-5 h-5 text-gold" />
                Authenticity Guaranteed
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs: Description | Notes | Reviews */}
        <div className="mt-16">
          {/* Tab Navigation */}
          <div className="flex border-b border-gold/10 mb-8">
            {[
              { key: 'description', label: 'Description' },
              { key: 'notes', label: 'Fragrance Notes' },
              { key: 'details', label: 'Details' },
              { key: 'reviews', label: `Reviews (${product.review_count || 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-montserrat uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab.key
                    ? 'text-gold border-gold'
                    : 'text-theme-muted border-transparent hover:text-theme-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-w-3xl">
            {activeTab === 'description' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="prose prose-invert max-w-none"
              >
                <p className="text-theme-muted leading-relaxed whitespace-pre-line text-lg">
                  {product.description || 'No description available.'}
                </p>
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProductNotes
                  topNotes={product.top_notes || []}
                  middleNotes={product.middle_notes || []}
                  baseNotes={product.base_notes || []}
                />
              </motion.div>
            )}

            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <DetailRow label="Gender" value={product.gender} />
                <DetailRow label="Fragrance Family" value={product.fragrance_family} />
                <DetailRow
                  label="Concentration"
                  value={CONCENTRATIONS.find((c) => c.value === product.concentration)?.label}
                />
                <DetailRow
                  label="Longevity"
                  value={LONGEVITY_OPTIONS.find((l) => l.value === product.longevity)?.label}
                />
                <DetailRow
                  label="Projection"
                  value={PROJECTION_OPTIONS.find((p) => p.value === product.projection)?.label}
                />
                {product.season?.length > 0 && (
                  <DetailRow label="Season" value={product.season.map((s) => s.replace('_', ' ')).join(', ')} />
                )}
                {product.occasion?.length > 0 && (
                  <DetailRow label="Occasion" value={product.occasion.map((o) => o.replace('_', ' ')).join(', ')} />
                )}
                <DetailRow label="SKU" value={selectedVariant?.sku || 'N/A'} />
                <DetailRow label="Total Stock" value={`${totalStock} bottles`} />
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProductReviews productId={product.id} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-16">
            <RelatedProducts products={related} />
          </div>
        )}
      </div>

      {/* Mobile Sticky Buy Bar */}
      <StickyBuyBar
        product={product}
        selectedVariant={selectedVariant}
        quantity={quantity}
      />
    </>
  );
}

// Detail Row Component
function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-3 border-b border-theme-border/60">
      <span className="text-theme-muted font-montserrat text-sm">{label}</span>
      <span className="text-theme-text text-sm capitalize">{value}</span>
    </div>
  );
}
