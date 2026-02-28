import React, { useState } from 'react';
import { ProductSearchQuery } from '../../types';

interface ProductSearchFiltersProps {
  filters: ProductSearchQuery;
  onFilterChange: (filters: Partial<ProductSearchQuery>) => void;
}

const categories = [
  'Materiales eléctricos',
  'Piezas de plomería',
  'Pintura y barniz',
  'Materiales de madera',
  'Productos decorativos',
  'Materiales de arte',
];

const ProductSearchFilters: React.FC<ProductSearchFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const [localFilters, setLocalFilters] = useState({
    keyword: filters.keyword || '',
    minPrice: filters.minPrice?.toString() || '',
    maxPrice: filters.maxPrice?.toString() || '',
    brand: filters.brand || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    onFilterChange({
      keyword: localFilters.keyword || undefined,
      minPrice: localFilters.minPrice ? Number(localFilters.minPrice) : undefined,
      maxPrice: localFilters.maxPrice ? Number(localFilters.maxPrice) : undefined,
      brand: localFilters.brand || undefined,
    });
  };

  const handleClearFilters = () => {
    setLocalFilters({
      keyword: '',
      minPrice: '',
      maxPrice: '',
      brand: '',
    });
    onFilterChange({
      keyword: undefined,
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      brand: undefined,
      inStock: undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
        <button
          onClick={handleClearFilters}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Limpiar
        </button>
      </div>

      <div className="space-y-6">
        {/* Keyword Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <input
            type="text"
            value={localFilters.keyword}
            onChange={(e) => handleInputChange('keyword', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
            placeholder="Nombre del producto..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => onFilterChange({ category: e.target.value || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rango de precio
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={localFilters.minPrice}
              onChange={(e) => handleInputChange('minPrice', e.target.value)}
              placeholder="Mín"
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              value={localFilters.maxPrice}
              onChange={(e) => handleInputChange('maxPrice', e.target.value)}
              placeholder="Máx"
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marca
          </label>
          <input
            type="text"
            value={localFilters.brand}
            onChange={(e) => handleInputChange('brand', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
            placeholder="Nombre de la marca..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* In Stock */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.inStock || false}
              onChange={(e) => onFilterChange({ inStock: e.target.checked || undefined })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Solo en stock</span>
          </label>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApplyFilters}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
};

export default ProductSearchFilters;
