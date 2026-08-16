import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactAPI } from '../../services/api';
import { HiMail, HiMailOpen, HiTrash, HiChevronDown, HiUser, HiReply } from 'react-icons/hi';
import { formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Messages() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unread

  const { data, isLoading } = useQuery({
    queryKey: ['adminContactMessages', page],
    queryFn: () => contactAPI.list({ page, limit: 20 }),
  });

  const messages = data?.data?.messages || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const visibleMessages = filter === 'unread' ? messages.filter((m) => !m.is_read) : messages;
  const unreadCount = messages.filter((m) => !m.is_read).length;

  const readMutation = useMutation({
    mutationFn: (id) => contactAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminContactMessages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => contactAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminContactMessages'] });
      toast.success('Message deleted');
    },
    onError: () => toast.error('Failed to delete message'),
  });

  const toggleExpand = (msg) => {
    const opening = expandedId !== msg.id;
    setExpandedId(opening ? msg.id : null);
    if (opening && !msg.is_read) readMutation.mutate(msg.id);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this message? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-playfair font-bold">Messages</h1>
          <p className="text-sm text-gray-400 mt-1">
            Submissions from the Contact Us form{unreadCount > 0 && <span className="text-gold"> · {unreadCount} unread</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-montserrat transition-colors ${filter === 'all' ? 'bg-gold text-black' : 'bg-noir border border-gray-700 text-gray-300'}`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-montserrat transition-colors ${filter === 'unread' ? 'bg-gold text-black' : 'bg-noir border border-gray-700 text-gray-300'}`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <HiMail className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            {filter === 'unread' ? 'No unread messages' : 'No messages yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {visibleMessages.map((msg) => (
              <div key={msg.id}>
                <button
                  onClick={() => toggleExpand(msg)}
                  className={`w-full text-left p-4 flex items-start gap-4 hover:bg-gold/5 transition-colors ${!msg.is_read ? 'bg-gold/[0.03]' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!msg.is_read ? 'bg-gold/15 text-gold' : 'bg-gray-800 text-gray-500'}`}>
                    {msg.is_read ? <HiMailOpen className="w-4 h-4" /> : <HiMail className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-montserrat ${!msg.is_read ? 'text-white font-semibold' : 'text-gray-300'}`}>
                        {msg.name}
                      </span>
                      <span className="text-xs text-gray-500">{msg.email}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate mt-0.5">{msg.subject || msg.message}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(msg.created_at)}</span>
                    <button
                      onClick={(e) => handleDelete(e, msg.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      aria-label="Delete message"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                    <HiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === msg.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {expandedId === msg.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden bg-noir/40"
                    >
                      <div className="p-4 pl-[68px] space-y-3">
                        {msg.subject && (
                          <p className="text-sm text-gray-300"><span className="text-gray-500">Subject:</span> {msg.subject}</p>
                        )}
                        <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">{msg.message}</p>
                        <a
                          href={`mailto:${msg.email}${msg.subject ? `?subject=Re: ${encodeURIComponent(msg.subject)}` : ''}`}
                          className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
                        >
                          <HiReply className="w-3.5 h-3.5" /> Reply by email
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-lg bg-noir border border-gray-700 text-sm text-gray-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-lg bg-noir border border-gray-700 text-sm text-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
