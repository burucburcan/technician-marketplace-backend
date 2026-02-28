import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useSearchProductsQuery } from '../../store/api/productApi'
import type { Product, ProductSearchQuery } from '../../types'

interface ProductSearchScreenProps {
  navigation: any
}

export const ProductSearchScreen: React.FC<ProductSearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState<ProductSearchQuery>({
    keyword: '',
    page: 1,
    pageSize: 20,
  })
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, isFetching, refetch } = useSearchProductsQuery({
    ...searchQuery,
    keyword: debouncedKeyword,
  })

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchQuery.keyword || '')
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery.keyword])

  const handleSearch = useCallback((text: string) => {
    setSearchQuery((prev) => ({ ...prev, keyword: text, page: 1 }))
  }, [])

  const handleFilterChange = useCallback((filters: Partial<ProductSearchQuery>) => {
    setSearchQuery((prev) => ({ ...prev, ...filters, page: 1 }))
  }, [])

  const handleLoadMore = useCallback(() => {
    if (data && data.page < Math.ceil(data.total / data.pageSize)) {
      setSearchQuery((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
    }
  }, [data])

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <Image
          source={{ uri: item.images[0]?.thumbnailUrl || item.images[0]?.url }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            {item.currency} ${item.price.toFixed(2)}
          </Text>
          <View style={styles.productMeta}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.totalReviews})</Text>
            </View>
            <View style={[styles.stockBadge, !item.isAvailable && styles.outOfStock]}>
              <Text style={styles.stockText}>
                {item.isAvailable ? `Stock: ${item.stockQuantity}` : 'Out of Stock'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  )

  const renderEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products found</Text>
        <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
      </View>
    ),
    []
  )

  const renderFooter = useMemo(() => {
    if (!isFetching) return null
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    )
  }, [isFetching])

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery.keyword}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Sort By:</Text>
          <View style={styles.sortOptions}>
            {['price', 'rating', 'popularity', 'newest'].map((sort) => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortButton,
                  searchQuery.sortBy === sort && styles.sortButtonActive,
                ]}
                onPress={() => handleFilterChange({ sortBy: sort as any })}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    searchQuery.sortBy === sort && styles.sortButtonTextActive,
                  ]}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Product List */}
      {isLoading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={data?.products || []}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isFetching && !!data} onRefresh={refetch} />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#F9F9F9',
  },
  filterButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 8,
    maxWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'column',
    gap: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666666',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999999',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
  },
  outOfStock: {
    backgroundColor: '#FFEBEE',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
})
