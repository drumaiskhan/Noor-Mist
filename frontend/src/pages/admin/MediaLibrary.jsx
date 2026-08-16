import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { HiUpload, HiSearch, HiTrash, HiX, HiPhotograph, HiClipboardCopy } from 'react-icons/hi';
import { mediaAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function MediaLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const { data, isLoading } = useQuery({
    queryKey: ['media', search],
    queryFn: async () => {
      const { data } = await mediaAPI.getAll({ search });
      return data;
    },
  });

  const media = data?.media ?? [];

  const deleteMutation = useMutation({
    mutationFn: mediaAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); toast.success('Deleted'); setPreviewItem(null); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: mediaAPI.bulkDelete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); setSelected(new Set()); toast.success('Deleted selected items'); },
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    let success = 0;
    for (const file of files) {
      try {
        await uploadAPI.image(file);
        success++;
      } catch { toast.error(`Failed: ${file.name}`); }
    }
    if (success) {
      toast.success(`Uploaded ${success} file${success > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['media'] });
    }
    setUploading(false);
    e.target.value = '';
  };

  const toggleSelect = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const copyUrl = (url) => { navigator.clipboard.writeText(url); toast.success('URL copied'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Media Library</h1>
          <p className="text-gray-400 text-sm">{data?.total ?? 0} files uploaded</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm hover:bg-red-900/50 transition-colors"
              disabled={bulkDeleteMutation.isPending}
            >
              <HiTrash className="w-4 h-4" /> Delete {selected.size}
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold text-black rounded-lg text-sm font-semibold hover:bg-gold/90 transition-colors"
          >
            <HiUpload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload Files'}
          </button>
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by filename or tag…"
          className="w-full bg-noir-card border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-gold outline-none"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-noir-card rounded-xl animate-pulse" />)}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <HiPhotograph className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No media yet</p>
          <p className="text-sm mt-1">Upload images to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                selected.has(item.id) ? 'border-gold' : 'border-transparent hover:border-gray-600'
              }`}
              onClick={() => setPreviewItem(item)}
            >
              <img src={item.url} alt={item.alt_text || item.filename} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-gold"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{item.filename}</p>
                <p className="text-gray-400 text-xs">{formatBytes(item.size)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewItem(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-noir-card rounded-2xl border border-gray-700 overflow-hidden max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="font-playfair font-bold text-white truncate pr-4">{previewItem.filename}</h3>
                <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-white flex-shrink-0"><HiX className="w-5 h-5" /></button>
              </div>
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-1/2 bg-gray-900 p-4 flex items-center justify-center min-h-48">
                  <img src={previewItem.url} alt="" className="max-h-64 object-contain rounded-lg" />
                </div>
                <div className="sm:w-1/2 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 font-montserrat mb-1">URL</p>
                    <div className="flex gap-2">
                      <input readOnly value={previewItem.url} className="flex-1 bg-noir border border-gray-700 rounded px-2 py-1.5 text-white text-xs font-mono min-w-0" />
                      <button onClick={() => copyUrl(previewItem.url)} className="text-gray-400 hover:text-gold flex-shrink-0 p-1.5">
                        <HiClipboardCopy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 text-gray-400">
                    {previewItem.size && <p>Size: {formatBytes(previewItem.size)}</p>}
                    {previewItem.mime_type && <p>Type: {previewItem.mime_type}</p>}
                    <p>Uploaded: {new Date(previewItem.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(previewItem.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 px-3 py-2 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm hover:bg-red-900/50 transition-colors w-full justify-center"
                  >
                    <HiTrash className="w-4 h-4" />
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
