import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useGetProductDetailsQuery, useAddToCartMutation, useGetProductReviewsQuery } from '../../store/api/productApi'
import type { ProductReview } from '../../types'

const { width } = Dimensions.get('window')

interface ProductDetailScreenProps {
  route: any
  navigation: any
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ route, navigation }) => {
  const { productId } = route.params
  const [quantity, setQuantity] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details')

  const { data: product, isLoading } = useGetProductDetailsQuery(productId)
  const { data: reviewsData } = useGetProductReviewsQuery({ productId, page: 1 })
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation()

  const handleAddToCart = useCallback(async () => {
    if (!product?.isAvailable) {
      Alert.alert('Out of Stock', 'This product is currently unavailable')
      return
    }

    try {
      await addToCart({ productId, quantity }).unwrap()
      Alert.alert('Success', 'Product added to cart', [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to add product to cart')
    }
  }, [product, productId, quantity, addToCart, navigation])

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(prev + delta, product?.stockQuantity || 1)))
  }, [product])

  const renderImageCarousel = useCallback(() => {
    if (!product?.images.length) return null

    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width)
            setActiveImageIndex(index)
          }}
          scrollEventThrottle={16}
        >
          {product.images.map((image) => (
            <Image
              key={image.id}
              source={{ uri: image.url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        <View style={styles.pagination}>
          {product.images.map((_, index) => (
            <View
              key={index}
              style={[styles.paginationDot, index === activeImageIndex && styles.paginationDotActive]}
            />
          ))}
        </View>
      </View>
    )
  }, [product, activeImageIndex])

  const renderReviewItem = useCallback(({ item }: { item: ProductReview }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewRating}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text key={star} style={styles.star}>
              {star <= item.rating ? '⭐' : '☆'}
            </Text>
          ))}
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      {item.isVerifiedPurchase && (
        <Text style={styles.verifiedBadge}>✓ Verified Purchase</Text>
      )}
    </View>
  ), [])

  if (isLoading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Image Carousel */}
        {renderImageCarousel()}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>
            {product.currency} ${product.price.toFixed(2)}
          </Text>

          {/* Rating and Stock */}
          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>⭐ {product.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({product.totalReviews} reviews)</Text>
            </View>
            <View style={[styles.stockBadge, !product.isAvailable && styles.outOfStock]}>
              <Text style={[styles.stockText, !product.isAvailable && styles.outOfStockText]}>
                {product.isAvailable ? `In Stock: ${product.stockQuantity}` : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Supplier Info */}
          {product.supplier && (
            <TouchableOpacity
              style={styles.supplierContainer}
              onPress={() => navigation.navigate('SupplierProfile', { supplierId: product.supplierId })}
            >
              <Text style={styles.supplierLabel}>Sold by:</Text>
              <Text style={styles.supplierName}>{product.supplier.companyName}</Text>
              <Text style={styles.supplierRating}>⭐ {product.supplier.rating.toFixed(1)}</Text>
            </TouchableOpacity>
          )}

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'details' && styles.tabActive]}
              onPress={() => setActiveTab('details')}
            >
              <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                Reviews ({product.totalReviews})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'details' ? (
            <View style={styles.detailsContent}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>

              {product.specifications.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Specifications</Text>
                  {product.specifications.map((spec, index) => (
                    <View key={index} style={styles.specRow}>
                      <Text style={styles.specKey}>{spec.key}:</Text>
                      <Text style={styles.specValue}>
                        {spec.value} {spec.unit || ''}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {product.brand && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Brand:</Text>
                  <Text style={styles.specValue}>{product.brand}</Text>
                </View>
              )}

              {product.model && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Model:</Text>
                  <Text style={styles.specValue}>{product.model}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.reviewsContent}>
              {reviewsData?.reviews.map((review) => renderReviewItem({ item: review }))}
              {(!reviewsData?.reviews || reviewsData.reviews.length === 0) && (
                <Text style={styles.noReviews}>No reviews yet</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(1)}
            disabled={quantity >= (product.stockQuantity || 0)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addToCartButton, (!product.isAvailable || isAddingToCart) && styles.addToCartButtonDisabled]}
          onPress={handleAddToCart}
          disabled={!product.isAvailable || isAddingToCart}
        >
          {isAddingToCart ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselContainer: {
    height: 300,
    backgroundColor: '#FFFFFF',
  },
  productImage: {
    width,
    height: 300,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#999999',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#E8F5E9',
  },
  outOfStock: {
    backgroundColor: '#FFEBEE',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  outOfStockText: {
    color: '#F44336',
  },
  supplierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 16,
  },
  supplierLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  supplierRating: {
    fontSize: 14,
    color: '#666666',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  detailsContent: {
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  specKey: {
    fontSize: 14,
    color: '#666666',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  reviewsContent: {
    marginBottom: 100,
  },
  reviewItem: {
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 8,
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  noReviews: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 32,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  quantityText: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  addToCartButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
