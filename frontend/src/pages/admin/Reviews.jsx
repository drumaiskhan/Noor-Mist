import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewAPI } from '../../services/api';
import {
  HiStar, HiCheck, HiX, HiReply, HiPhotograph,
  HiTrash, HiUpload, HiDotsVertical, HiExternalLink,
} from 'react-icons/hi';
import Rating from '../../components/UI/Rating';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected'];

const statusBadge = (status) => {
  if (status === 'approved') return 'bg-green-500/10 text-green-400 border border-green-500/20';
  if (status === 'rejected') return 'bg-red-500/10 text-red-400 border border-red-500/20';
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
};

export default function Reviews() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [replyText, setReplyText]       = useState({});
  const [replyingTo, setReplyingTo]     = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null); // review id being uploaded to
  const fileInputRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['adminReviews', statusFilter],
    queryFn: async () => {
      const { data } = await reviewAPI.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      return data;
    },
  });
  const reviews = data?.reviews || [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => reviewAPI.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success(`Review ${status}`);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }) => reviewAPI.reply(id, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('Reply saved');
      setReplyingTo(null);
      setReplyText({});
    },
    onError: () => toast.error('Failed to save reply'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, files }) => reviewAPI.addImages(id, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('Images uploaded');
      setUploadingFor(null);
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteImageMutation = useMutation({
    mutationFn: ({ reviewId, imageId }) => reviewAPI.deleteImage(reviewId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('Image removed');
    },
    onError: () => toast.error('Failed to remove image'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reviewAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      toast.success('Review deleted');
    },
    onError: () => toast.error('Failed to delete review'),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleReply = (reviewId) => {
    if (!replyText[reviewId]?.trim()) return;
    replyMutation.mutate({ id: reviewId, reply: replyText[reviewId] });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !uploadingFor) return;
    uploadMutation.mutate({ id: uploadingFor, files });
    e.target.value = '';
  };

  const openFilePicker = (reviewId) => {
    setUploadingFor(reviewId);
    fileInputRef.current?.click();
  };

  const countByStatus = (s) => s === 'all' ? data?.total ?? reviews.length : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Hidden global file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-playfair font-bold mb-1">Reviews</h1>
        <p className="text-gray-400 text-sm">{data?.total ?? reviews.length} total</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-montserrat capitalize transition-all ${
              statusFilter === tab
                ? 'bg-gold/10 text-gold border border-gold/30'
                : 'text-gray-400 border border-gray-700 hover:border-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="luxury-card p-6 space-y-3">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No {statusFilter === 'all' ? '' : statusFilter} reviews
          </div>
        ) : (
          <AnimatePresence>
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="luxury-card p-6"
              >
                {/* ── Top row: meta + status badge ── */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Rating value={review.rating} size="sm" />
                      <span className="text-sm text-gray-300 font-medium truncate">
                        {review.user_name || 'Anonymous'}
                      </span>
                      {review.is_verified_purchase && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <HiCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      <span className="text-gray-400">{review.product_name || `Product #${review.product_id}`}</span>
                      {' · '}{formatDate(review.created_at)}
                      {review.email && <span className="ml-2 opacity-60">{review.email}</span>}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${statusBadge(review.status)}`}>
                    {review.status}
                  </span>
                </div>

                {/* ── Content ── */}
                {review.title && (
                  <h4 className="text-white font-bold font-playfair mb-1">{review.title}</h4>
                )}
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {review.content || review.body}
                </p>

                {/* ── Images ── */}
                {review.images?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {review.images.map((img) => (
                      <div key={img.id} className="relative group">
                        <a href={img.url} target="_blank" rel="noreferrer">
                          <img
                            src={img.url}
                            alt="Review"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-700 group-hover:opacity-80 transition-opacity"
                          />
                        </a>
                        <button
                          onClick={() => deleteImageMutation.mutate({ reviewId: review.id, imageId: img.id })}
                          disabled={deleteImageMutation.isPending}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center
                                     opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="Remove image"
                        >
                          <HiX className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Admin reply (existing) ── */}
                {review.admin_reply && replyingTo !== review.id && (
                  <div className="ml-4 pl-4 border-l-2 border-gold/30 mb-4">
                    <p className="text-xs text-gold font-montserrat mb-1">Your Reply</p>
                    <p className="text-gray-400 text-sm">{review.admin_reply}</p>
                  </div>
                )}

                {/* ── Reply form ── */}
                <AnimatePresence>
                  {replyingTo === review.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <textarea
                        value={replyText[review.id] || review.admin_reply || ''}
                        onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                        placeholder="Write your reply..."
                        rows={2}
                        className="w-full bg-noir border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-gold outline-none resize-none"
                      />
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => handleReply(review.id)}
                          disabled={replyMutation.isPending}
                          className="text-xs text-gold hover:underline disabled:opacity-50"
                        >
                          {replyMutation.isPending ? 'Saving…' : 'Save Reply'}
                        </button>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Action bar ── */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-gray-800">
                  {/* Approve */}
                  {review.status !== 'approved' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: review.id, status: 'approved' })}
                      disabled={statusMutation.isPending}
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                    >
                      <HiCheck className="w-4 h-4" /> Approve
                    </button>
                  )}

                  {/* Reject */}
                  {review.status !== 'rejected' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: review.id, status: 'rejected' })}
                      disabled={statusMutation.isPending}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      <HiX className="w-4 h-4" /> Reject
                    </button>
                  )}

                  {/* Reply */}
                  <button
                    onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold transition-colors"
                  >
                    <HiReply className="w-4 h-4" />
                    {review.admin_reply ? 'Edit Reply' : 'Reply'}
                  </button>

                  {/* Upload images */}
                  <button
                    onClick={() => openFilePicker(review.id)}
                    disabled={uploadMutation.isPending && uploadingFor === review.id}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold transition-colors disabled:opacity-50"
                  >
                    <HiPhotograph className="w-4 h-4" />
                    {uploadMutation.isPending && uploadingFor === review.id
                      ? 'Uploading…'
                      : 'Add Photos'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this review permanently?'))
                        deleteMutation.mutate(review.id);
                    }}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors ml-auto"
                  >
                    <HiTrash className="w-4 h-4" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
