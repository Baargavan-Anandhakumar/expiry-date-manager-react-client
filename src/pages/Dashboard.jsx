import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Package, AlertTriangle, AlertCircle, Trash2, Edit, Plus, Search, Filter, X, Barcode, Camera } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and search
  const [search, setSearch] = useState('');
  const [expiresIn, setExpiresIn] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    upcCode: '',
    amountValue: '',
    amountCurrency: 'USD',
    expiryDate: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProducts = async (page = 1, searchQuery = search, expireFilter = expiresIn) => {
    setIsLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (searchQuery) params.search = searchQuery;
      if (expireFilter) params.expiresIn = expireFilter;
      
      const { data } = await api.get('products', { params });
      setProducts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(1, search, expiresIn);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, expiresIn]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchProducts(newPage, search, expiresIn);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`products/${id}`);
      fetchProducts(pagination.page, search, expiresIn);
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  // Modal handlers
  const openModal = (product = null) => {
    setFormError('');
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        upcCode: product.upcCode || '',
        amountValue: product.amount?.value || '',
        amountCurrency: product.amount?.currency || 'USD',
        expiryDate: product.expiryDate ? format(parseISO(product.expiryDate), 'yyyy-MM-dd') : ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ title: '', upcCode: '', amountValue: '', amountCurrency: 'USD', expiryDate: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setIsScanning(false);
  };

  useEffect(() => {
    if (isScanning && isModalOpen) {
      // Small timeout to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner('reader', {
            qrbox: { width: 250, height: 150 },
            fps: 10,
          }, false);
  
          scannerRef.current.render(
            (decodedText) => {
              setFormData(prev => ({ ...prev, upcCode: decodedText }));
              setIsScanning(false);
            },
            (err) => {
              // ignoring continuous errors
            }
          );
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.log('Failed to clear scanner', e));
          scannerRef.current = null;
        }
      };
    }
  }, [isScanning, isModalOpen]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const payload = {
      title: formData.title,
      upcCode: formData.upcCode,
      amount: {
        value: Number(formData.amountValue),
        currency: formData.amountCurrency
      },
      expiryDate: formData.expiryDate
    };

    try {
      if (editingProduct) {
        await api.put(`products/${editingProduct._id}`, payload);
      } else {
        await api.post('products', payload);
      }
      closeModal();
      fetchProducts(pagination.page, search, expiresIn);
    } catch (err) {
      setFormError(err.response?.data?.message || `Failed to ${editingProduct ? 'update' : 'add'} product`);
    } finally {
      setFormLoading(false);
    }
  };

  // Stats calculation
  const now = new Date();
  const totalItems = pagination.total || 0;
  
  const expiringSoonCount = products.filter(item => {
    const daysLeft = differenceInDays(parseISO(item.expiryDate), now);
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const expiredCount = products.filter(item => {
    const daysLeft = differenceInDays(parseISO(item.expiryDate), now);
    return daysLeft < 0;
  }).length;

  const stats = [
    { name: 'Total Products', value: totalItems, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Expiring Soon', value: expiringSoonCount, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Expired', value: expiredCount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const getExpiryStatus = (dateString) => {
    const daysLeft = differenceInDays(parseISO(dateString), now);
    if (daysLeft < 0) return { label: 'Expired', color: 'bg-red-50 text-red-700 ring-1 ring-red-600/20' };
    if (daysLeft <= 7) return { label: 'Expiring Soon', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20' };
    return { label: 'Good', color: 'bg-green-50 text-green-700 ring-1 ring-green-600/20' };
  };

  return (
    <div className="space-y-6 relative max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your inventory and track expiring products.</p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="flex items-center justify-center w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 shadow-lg shadow-indigo-500/30 px-5 py-3 sm:py-2.5 rounded-2xl hover:bg-indigo-700 transition-all font-medium transform active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>

      {/* Stats Grid - Responsive layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="premium-card overflow-hidden hover:shadow-lg transition-all">
              <div className="p-5 sm:p-6 flex items-center">
                <div className={`flex-shrink-0 p-3 sm:p-4 rounded-2xl sm:rounded-3xl ${stat.bg}`}>
                  <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${stat.color}`} aria-hidden="true" />
                </div>
                <div className="ml-4 sm:ml-5 w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-semibold text-slate-500 truncate uppercase tracking-wider">{stat.name}</dt>
                  <dd className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{stat.value}</dd>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: Search and Filter */}
      <div className="premium-card p-4 sm:p-5 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl sm:rounded-3xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
            placeholder="Search products or UPC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-5 w-5 text-slate-400 hidden sm:block" />
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            className="block w-full sm:w-56 pl-4 pr-10 py-3 text-sm border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white rounded-2xl sm:rounded-3xl transition-all"
          >
            <option value="">All Time</option>
            <option value="1">Expiring within 1 Month</option>
            <option value="3">Expiring within 3 Months</option>
            <option value="6">Expiring within 6 Months</option>
          </select>
        </div>
      </div>

      {/* Products Display */}
      <div className="premium-card overflow-hidden">
        {error && <div className="p-4 bg-red-50 text-red-600 text-center text-sm">{error}</div>}
        {isLoading && !products.length ? (
          <div className="p-12 text-center text-slate-500 animate-pulse text-sm">Loading your inventory...</div>
        ) : products.length === 0 ? (
          <div className="p-10 sm:p-16 text-center flex flex-col items-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <Package className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">No products found</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm text-center">Your inventory looks a bit empty. Get started by adding a new product or scanning a barcode.</p>
            <button onClick={() => openModal()} className="mt-6 text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors">
              + Add your first product
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Product Info</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Price/Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {products.map((product) => {
                    const status = getExpiryStatus(product.expiryDate);
                    return (
                      <tr key={product._id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900">{product.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Barcode className="w-3 h-3" /> {product.upcCode || 'No UPC'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                          {product.amount?.currency} {product.amount?.value?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {format(parseISO(product.expiryDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(product)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Hidden on desktop) */}
            <div className="md:hidden divide-y divide-slate-100">
              {products.map((product) => {
                const status = getExpiryStatus(product.expiryDate);
                return (
                  <div key={product._id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-4">
                        <h4 className="text-sm sm:text-base font-semibold text-slate-900 break-words">{product.title}</h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Barcode className="w-3 h-3" /> {product.upcCode || 'No UPC'}
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 inline-flex text-[10px] sm:text-xs leading-5 font-bold rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end mt-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">Expires</div>
                        <div className="text-sm font-medium text-slate-900">
                          {format(parseISO(product.expiryDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-700">
                          {product.amount?.currency} {product.amount?.value?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                      <button 
                        onClick={() => openModal(product)} 
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(product._id)} 
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-transparent px-4 sm:px-6 py-4 flex items-center justify-between border-t border-slate-200/60">
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Page <span className="font-semibold text-slate-900">{pagination.page}</span> of <span className="font-semibold text-slate-900">{pagination.pages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-xl sm:rounded-2xl shadow-sm overflow-hidden border border-slate-200" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-3 sm:px-4 py-2 border-r border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 transition-colors min-h-[40px]"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-3 sm:px-4 py-2 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 transition-colors min-h-[40px]"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModal} />
          
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
            <div className="pointer-events-auto w-screen max-w-md h-full transform transition-transform ease-in-out duration-300 translate-x-0 pt-10 sm:pt-0">
              <div className="flex h-full flex-col bg-white shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-none">
                <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-100 bg-slate-50/50 shadow-sm z-10 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900" id="slide-over-title">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <button
                    type="button"
                    className="rounded-full bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    onClick={closeModal}
                  >
                    <span className="sr-only">Close panel</span>
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="relative flex-1 px-4 sm:px-6 py-5 sm:py-6 overflow-y-auto bg-white">
                  {formError && (
                    <div className="mb-5 p-3 sm:p-4 rounded-xl sm:rounded-3xl bg-red-50 text-red-700 text-xs sm:text-sm font-medium flex items-start gap-2 sm:gap-3 border border-red-100">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-red-500 mt-0.5" /> 
                      <span className="break-words flex-1">{formError}</span>
                    </div>
                  )}

                  <form id="product-form" onSubmit={handleFormSubmit} className="space-y-5 sm:space-y-6 pb-20 sm:pb-0">
                    <div>
                      <label htmlFor="upcCode" className="block text-sm font-semibold text-slate-700 mb-1.5">UPC Barcode (Scan or Enter)</label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Barcode className="h-5 w-5 text-slate-400" />
                          </div>
                          <input
                            type="text"
                            name="upcCode"
                            id="upcCode"
                            placeholder="012345678905"
                            value={formData.upcCode}
                            onChange={handleFormChange}
                            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl sm:rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 focus:bg-white transition-all shadow-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsScanning(!isScanning)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-xl sm:rounded-3xl hover:bg-indigo-100 transition-colors shadow-sm min-h-[44px]"
                        >
                          <Camera className="w-5 h-5" />
                          {isScanning ? 'Cancel' : 'Scan'}
                        </button>
                      </div>
                      <div className={`mt-3 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm ${isScanning ? 'block' : 'hidden'}`}>
                        <div id="reader" className="w-full min-h-[200px]"></div>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500 ml-1">Scan with your camera or type manually.</p>
                    </div>

                    <div>
                      <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1.5">Product Title</label>
                      <input
                        type="text"
                        name="title"
                        id="title"
                        required
                        placeholder="e.g. Organic Milk"
                        value={formData.title}
                        onChange={handleFormChange}
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl sm:rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
                      <div>
                        <label htmlFor="amountValue" className="block text-sm font-semibold text-slate-700 mb-1.5">Price / Amount</label>
                        <div className="relative">
                           <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 font-medium">
                             {formData.amountCurrency === 'USD' ? '$' : formData.amountCurrency === 'EUR' ? '€' : formData.amountCurrency === 'GBP' ? '£' : '₹'}
                           </span>
                           <input
                             type="number"
                             step="0.01"
                             name="amountValue"
                             id="amountValue"
                             required
                             placeholder="0.00"
                             value={formData.amountValue}
                             onChange={handleFormChange}
                             className="block w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl sm:rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 focus:bg-white transition-all shadow-sm"
                           />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="amountCurrency" className="block text-sm font-semibold text-slate-700 mb-1.5">Currency</label>
                        <select
                          name="amountCurrency"
                          id="amountCurrency"
                          value={formData.amountCurrency}
                          onChange={handleFormChange}
                          className="block w-full px-4 py-3 border border-slate-200 rounded-xl sm:rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 focus:bg-white transition-all shadow-sm"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="expiryDate" className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date</label>
                      <input
                        type="date"
                        name="expiryDate"
                        id="expiryDate"
                        required
                        value={formData.expiryDate}
                        onChange={handleFormChange}
                        className="block w-full px-4 py-3 border border-slate-200 rounded-xl sm:rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 focus:bg-white transition-all shadow-sm text-slate-700 min-h-[44px]"
                      />
                    </div>
                  </form>
                </div>
                
                <div className="flex justify-end px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-100 bg-slate-50 gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <button
                    type="button"
                    className="flex-1 sm:flex-none rounded-xl sm:rounded-3xl bg-white px-4 sm:px-5 py-3 sm:py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all min-h-[44px]"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    disabled={formLoading}
                    form="product-form"
                    className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-xl sm:rounded-3xl bg-indigo-600 px-4 sm:px-5 py-3 sm:py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                  >
                    {formLoading ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Add Product')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

