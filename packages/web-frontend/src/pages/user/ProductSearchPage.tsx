import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchProductsQuery } from '../../store/api/productApi';
import { ProductSearchQuery } from '../../types';
import ProductCard from '../../components/product/ProductCard';
import ProductSearchFilters from '../../components/product/ProductSearchFilters';

// Constants to avoid re-creating on each render
const LOADING_SKELETON_COUNT = 6;
const LOADING_SKELETON_INDICES = Array.from({ length: LOADING_SKELETON_COUNT }, (_, i) => i);

const ProductSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ProductSearchQuery>({
    keyword: searchParams.get('keyword') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    brand: searchParams.get('brand') || '',
    inStock: searchParams.get('inStock') === 'true',
    sortBy: (searchParams.get('sortBy') as any) || 'popularity',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: 20,
  });

  const { data, isLoading, error } = useSearchProductsQuery(filters);

  const handleFilterChange = useCallback((newFilters: Partial<ProductSearchQuery>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.set(key, String(value));
      }
    });
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    searchParams.set('page', String(page));
    setSearchParams(searchParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filters, searchParams, setSearchParams]);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleFilterChange({ sortBy: e.target.value as any });
  }, [handleFilterChange]);

  // Memoize pagination buttons to avoid re-creating on each render
  const totalPages = useMemo(() => {
    return data ? Math.ceil(data.total / filters.pageSize!) : 0;
  }, [data, filters.pageSize]);

  const paginationButtons = useMemo(() => {
    if (!data || totalPages <= 1) return null;
    
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [data, totalPages]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar productos</h2>
          <p className="text-gray-600">Por favor, intenta de nuevo más tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buscar Productos</h1>
          <p className="text-gray-600">
            Encuentra materiales y repuestos de calidad para tus proyectos
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <ProductSearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </aside>

          {/* Results */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {isLoading ? (
                    'Cargando...'
                  ) : (
                    `${data?.total || 0} productos encontrados`
                  )}
                </p>
                <select
                  value={filters.sortBy}
                  onChange={handleSortChange}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="popularity">Más populares</option>
                  <option value="price">Precio: menor a mayor</option>
                  <option value="rating">Mejor valorados</option>
                  <option value="newest">Más recientes</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {LOADING_SKELETON_INDICES.map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!isLoading && data && (
              <>
                {data.products.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Intenta ajustar tus filtros de búsqueda
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {data.total > filters.pageSize! && paginationButtons && (
                  <div className="mt-8 flex justify-center">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(filters.page! - 1)}
                        disabled={filters.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      {paginationButtons.map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            filters.page === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(filters.page! + 1)}
                        disabled={filters.page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductSearchPage;
