import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productAPI } from '../../services/api';
import { HiPlus, HiPencil, HiTrash, HiSearch, HiEye, HiStar, HiDownload, HiUpload, HiX, HiCheck } from 'react-icons/hi';
import { formatPrice, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const xmlInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminProducts', search, status, page],
    queryFn: () => productAPI.getAll({ search, status: status === 'all' ? '' : status, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: productAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminProducts']);
      toast.success('Product deleted');
    },
  });

  const products = data?.data?.products || [];
  const totalPages = data?.data?.pages || 1;

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportXml = async () => {
    try {
      const res = await productAPI.exportXml();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `noor-mist-products-${Date.now()}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Products exported as XML');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImportXml = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const { data: result } = await productAPI.importXml(text);
      setImportResult(result);
      queryClient.invalidateQueries(['adminProducts']);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden XML file input */}
      <input
        ref={xmlInputRef}
        type="file"
        accept=".xml,text/xml"
        className="hidden"
        onChange={handleImportXml}
      />

      {/* Import Result Modal */}
      <AnimatePresence>
        {importResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setImportResult(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-noir-light border border-gold/20 rounded-2xl p-6 w-full max-w-md">
              <button onClick={() => setImportResult(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <HiX className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-playfair font-bold mb-4">Import Results</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <HiCheck className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">{importResult.created} products created</span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <span className="text-yellow-400">{importResult.skipped} products skipped (duplicates)</span>
                  </div>
                )}
                {importResult.errors?.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm font-medium mb-2">{importResult.errors.length} errors:</p>
                    <ul className="text-red-400/80 text-xs space-y-1">
                      {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="btn-gold w-full mt-4 text-sm">Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold mb-1">Products</h1>
          <p className="text-gray-400 text-sm">{data?.data?.total || 0} total products</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => xmlInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 border border-gray-600 rounded-xl text-gray-300 hover:border-gold hover:text-gold transition-all disabled:opacity-50"
          >
            <HiUpload className="w-4 h-4" />
            {importing ? 'Importing…' : 'Import XML'}
          </button>
          <button
            onClick={handleExportXml}
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 border border-gray-600 rounded-xl text-gray-300 hover:border-gold hover:text-gold transition-all"
          >
            <HiDownload className="w-4 h-4" />
            Export XML
          </button>
          <Link to="/admin/products/new" className="btn-gold inline-flex items-center gap-2 text-sm">
            <HiPlus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-noir border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white text-sm focus:border-gold outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-noir border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-gold outline-none"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="luxury-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase">Product</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden md:table-cell">Category</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden lg:table-cell">Price</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden lg:table-cell">Stock</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden md:table-cell">Sales</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase hidden lg:table-cell">Rating</th>
                <th className="text-left p-4 text-xs text-gray-400 font-montserrat uppercase">Status</th>
                <th className="text-right p-4 text-xs text-gray-400 font-montserrat uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="p-4"><div className="skeleton h-5 w-40 rounded" /></td>
                    <td className="p-4 hidden md:table-cell"><div className="skeleton h-5 w-20 rounded" /></td>
                    <td className="p-4 hidden lg:table-cell"><div className="skeleton h-5 w-16 rounded" /></td>
                    <td className="p-4 hidden lg:table-cell"><div className="skeleton h-5 w-12 rounded" /></td>
                    <td className="p-4 hidden md:table-cell"><div className="skeleton h-5 w-12 rounded" /></td>
                    <td className="p-4 hidden lg:table-cell"><div className="skeleton h-5 w-12 rounded" /></td>
                    <td className="p-4"><div className="skeleton h-5 w-20 rounded" /></td>
                    <td className="p-4"><div className="skeleton h-5 w-16 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-800/50 hover:bg-gold/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.primary_image?.[0]?.url || '/placeholder.jpg'}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate max-w-[200px]">
                            {product.name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {product.variants?.length || 0} variants
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-gray-400 text-sm">{product.category_name || '—'}</span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-gold text-sm font-medium">
                        {formatPrice(product.min_price)}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={`text-sm font-bold ${
                        product.total_stock === 0 ? 'text-red-400' :
                        product.total_stock <= 10 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {product.total_stock || 0}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-gray-400 text-sm">{product.total_sold || 0}</span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <HiStar className="w-4 h-4 text-gold" />
                        <span className="text-gray-400 text-sm">{product.average_rating || '0'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        product.status === 'published' ? 'bg-green-500/10 text-green-400' :
                        product.status === 'draft' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/product/${product.slug}`}
                          target="_blank"
                          className="p-2 text-gray-400 hover:text-gold transition-colors"
                          title="View"
                        >
                          <HiEye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <HiPencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
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
        </div>
      )}
    </div>
  );
}
