import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiStar, HiPhotograph, HiCheck, HiReply, HiThumbUp, HiX, HiPencilAlt } from 'react-icons/hi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reviewAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import Rating from '../UI/Rating';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';

export default function ProductReviews({ productId }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reviewImages, setReviewImages] = useState([]); // File objects
  const [imagePreviews, setImagePreviews] = useState([]); // Data URLs for preview
  const [sortBy, setSortBy] = useState('newest');
  const fileInputRef = useRef(null);

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', productId, sortBy],
    queryFn: () => reviewAPI.getByProduct(productId, { sort: sortBy }),
  });

  const reviews = reviewsData?.reviews || [];
  const stats = reviewsData?.stats || { average: 0, total: 0, distribution: {} };

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // Step 1: create review
      const res = await reviewAPI.create(data);
      const reviewId = res.data?.review?.id;
      // Step 2: upload images if any
      if (reviewId && reviewImages.length > 0) {
        try {
          await reviewAPI.uploadImages(reviewId, reviewImages);
        } catch {
          // Images failed silently — review itself was submitted fine
        }
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', productId]);
      toast.success('Review submitted for approval');
      resetForm();
    },
    onError: () => toast.error('Failed to submit review'),
  });

  const resetForm = () => {
    setShowReviewForm(false);
    setRating(5);
    setTitle('');
    setContent('');
    setReviewImages([]);
    setImagePreviews([]);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newFiles = [...reviewImages, ...files].slice(0, 10); // cap at 10
    setReviewImages(newFiles);
    // generate previews
    newFiles.forEach((file, i) => {
      if (imagePreviews[i]) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => {
          const updated = [...prev];
          updated[i] = ev.target.result;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    submitMutation.mutate({
      product_id: productId,
      rating,
      title,
      content,
    });
  };

  return (
    <div className="space-y-8">
      {/* Review Summary */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="text-center">
          <div className="text-5xl font-playfair font-bold gold-text mb-2">
            {stats.average || '0'}
          </div>
          <Rating value={stats.average || 0} size="md" />
          <p className="text-theme-muted text-sm mt-2">{stats.total || 0} reviews</p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution?.[star] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-theme-muted w-6">{star}</span>
                <HiStar className="w-4 h-4 text-gold" />
                <div className="flex-1 h-2 bg-theme-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-theme-muted w-10">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Write Review Button — always visible */}
        <div className="shrink-0">
          <button
            onClick={() => isAuthenticated ? setShowReviewForm(true) : navigate('/login')}
            className="flex items-center gap-2 px-5 py-3 border border-gold/50 text-gold rounded-xl hover:bg-gold hover:text-theme-bg transition-all font-montserrat text-sm font-semibold whitespace-nowrap"
          >
            <HiPencilAlt className="w-4 h-4" />
            Write a Review
          </button>
          {!isAuthenticated && (
            <p className="text-xs text-theme-muted opacity-70 mt-1.5 text-center">Sign in to review</p>
          )}
        </div>
      </div>

      {/* Review Form Modal */}
      <Modal isOpen={showReviewForm} onClose={resetForm} title="Write a Review">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="text-sm text-theme-muted mb-2 block">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl transition-colors"
                >
                  <HiStar className={`w-8 h-8 ${star <= rating ? 'text-gold fill-current' : 'text-theme-muted'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm text-theme-muted mb-2 block">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum up your experience"
              className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none"
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="text-sm text-theme-muted mb-2 block">Your Review</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts about this fragrance..."
              rows={4}
              className="w-full bg-theme-bg border border-theme-border rounded-lg px-4 py-3 text-theme-text focus:border-theme-primary outline-none resize-none"
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-sm text-theme-muted mb-2 block">
              Photos (optional, up to 10)
            </label>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HiX className="w-5 h-5 text-theme-text" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {reviewImages.length < 10 && (
              <label className="flex items-center gap-2 w-fit cursor-pointer px-4 py-2 border border-dashed border-theme-border rounded-lg hover:border-gold transition-colors text-sm text-theme-muted hover:text-theme-primary">
                <HiPhotograph className="w-5 h-5" />
                Add Photos
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button type="submit" variant="gold" disabled={submitMutation.isLoading}>
              {submitMutation.isLoading ? 'Submitting...' : 'Submit Review'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sort */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-playfair font-bold">Reviews</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-muted focus:border-theme-primary outline-none"
        >
          <option value="newest">Newest</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="luxury-card p-6">
              <div className="skeleton h-4 w-24 rounded mb-3" />
              <div className="skeleton h-4 w-full rounded mb-2" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-theme-muted text-lg">No reviews yet.</p>
          <p className="text-theme-muted opacity-70 text-sm mt-2">Be the first to review this fragrance.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="luxury-card p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Rating value={review.rating} size="sm" />
                    {review.is_verified_purchase && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <HiCheck className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="font-playfair font-bold text-theme-text">{review.title}</h4>
                  )}
                </div>
                <span className="text-xs text-theme-muted opacity-70">
                  {formatDate(review.created_at)}
                </span>
              </div>

              <p className="text-theme-muted mb-4">{review.content}</p>

              {/* Review Images */}
              {review.images?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {review.images.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt="Review"
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1 text-sm text-theme-muted hover:text-theme-primary transition-colors">
                  <HiThumbUp className="w-4 h-4" />
                  Helpful ({review.helpful_count || 0})
                </button>
              </div>

              {/* Admin Reply */}
              {review.admin_reply && (
                <div className="mt-4 ml-6 pl-4 border-l-2 border-gold/30">
                  <div className="flex items-center gap-2 mb-2">
                    <HiReply className="w-4 h-4 text-gold" />
                    <span className="text-sm text-gold font-montserrat">Noor Mist Team</span>
                  </div>
                  <p className="text-theme-muted text-sm">{review.admin_reply}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
