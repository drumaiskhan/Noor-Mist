import React from 'react';
import { HiCheck, HiX, HiReply, HiStar } from 'react-icons/hi';
import { reviewAPI } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function ReviewManager({ review, onUpdate }) {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: () => reviewAPI.updateStatus(review.id, 'approved'),
    onSuccess: () => { toast.success('Review approved'); queryClient.invalidateQueries({ queryKey: ['adminReviews'] }); },
  });

  const reject = useMutation({
    mutationFn: () => reviewAPI.updateStatus(review.id, 'rejected'),
    onSuccess: () => { toast.success('Review rejected'); queryClient.invalidateQueries({ queryKey: ['adminReviews'] }); },
  });

  return (
    <div className="luxury-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-medium text-white">{review.reviewer_name || review.first_name || 'Anonymous'}</p>
          <p className="text-xs text-gray-400">{review.product_name} • {new Date(review.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <HiStar key={i} className={`w-4 h-4 ${i < review.rating ? 'text-gold' : 'text-gray-700'}`} />
          ))}
        </div>
      </div>
      {review.title && <p className="text-sm font-semibold text-white mb-1">{review.title}</p>}
      <p className="text-sm text-gray-300 mb-4">{review.body}</p>
      {review.admin_reply && (
        <div className="bg-gold/5 border border-gold/10 rounded-xl p-3 mb-4">
          <p className="text-xs text-gold font-montserrat mb-1">Admin Reply</p>
          <p className="text-sm text-gray-300">{review.admin_reply}</p>
        </div>
      )}
      <div className="flex gap-2">
        {!review.is_approved && (
          <button onClick={() => approve.mutate()} className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs hover:bg-green-500/20 transition-colors">
            <HiCheck className="w-4 h-4" /> Approve
          </button>
        )}
        <button onClick={() => reject.mutate()} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
          <HiX className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  );
}
