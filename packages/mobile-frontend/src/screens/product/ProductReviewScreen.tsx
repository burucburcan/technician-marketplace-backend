import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useCreateProductReviewMutation, useCreateSupplierReviewMutation } from '../../store/api/productApi'

interface ProductReviewScreenProps {
  route: any
  navigation: any
}

type ReviewType = 'product' | 'supplier'

export const ProductReviewScreen: React.FC<ProductReviewScreenProps> = ({ route, navigation }) => {
  const { orderId, productId, supplierId } = route.params
  const reviewType: ReviewType = productId ? 'product' : 'supplier'

  // Product review state
  const [productRating, setProductRating] = useState(0)
  const [productComment, setProductComment] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])

  // Supplier review state
  const [qualityRating, setQualityRating] = useState(0)
  const [deliveryRating, setDeliveryRating] = useState(0)
  const [communicationRating, setCommunicationRating] = useState(0)
  const [supplierComment, setSupplierComment] = useState('')

  const [createProductReview, { isLoading: isSubmittingProduct }] = useCreateProductReviewMutation()
  const [createSupplierReview, { isLoading: isSubmittingSupplier }] = useCreateSupplierReviewMutation()

  const handlePickImages = useCallback(async () => {
    if (reviewImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload maximum 5 images')
      return
    }

    // TODO: Implement image picker using expo-image-picker
    // For now, show a placeholder alert
    Alert.alert('Image Picker', 'Image picker functionality will be implemented with expo-image-picker')
  }, [reviewImages])

  const handleRemoveImage = useCallback((index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmitProductReview = useCallback(async () => {
    if (productRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating')
      return
    }

    if (!productComment.trim()) {
      Alert.alert('Comment Required', 'Please write a comment')
      return
    }

    try {
      await createProductReview({
        orderId,
        productId,
        rating: productRating,
        comment: productComment,
        images: reviewImages,
      }).unwrap()

      Alert.alert('Success', 'Review submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review')
    }
  }, [orderId, productId, productRating, productComment, reviewImages, createProductReview, navigation])

  const handleSubmitSupplierReview = useCallback(async () => {
    if (qualityRating === 0 || deliveryRating === 0 || communicationRating === 0) {
      Alert.alert('Ratings Required', 'Please rate all categories')
      return
    }

    if (!supplierComment.trim()) {
      Alert.alert('Comment Required', 'Please write a comment')
      return
    }

    const overallRating = (qualityRating + deliveryRating + communicationRating) / 3

    try {
      await createSupplierReview({
        orderId,
        supplierId,
        productQualityRating: qualityRating,
        deliverySpeedRating: deliveryRating,
        communicationRating,
        overallRating,
        comment: supplierComment,
      }).unwrap()

      Alert.alert('Success', 'Review submitted successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review')
    }
  }, [orderId, supplierId, qualityRating, deliveryRating, communicationRating, supplierComment, createSupplierReview, navigation])

  const renderStarRating = useCallback(
    (rating: number, setRating: (rating: number) => void, label: string) => (
      <View style={styles.ratingSection}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    []
  )

  const renderProductReview = () => (
    <>
      {renderStarRating(productRating, setProductRating, 'Rate this product')}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Review</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share your experience with this product..."
          value={productComment}
          onChangeText={setProductComment}
          multiline
          numberOfLines={6}
          maxLength={500}
        />
        <Text style={styles.charCount}>{productComment.length}/500</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {reviewImages.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.reviewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {reviewImages.length < 5 && (
            <TouchableOpacity style={styles.addImageButton} onPress={handlePickImages}>
              <Text style={styles.addImageText}>+</Text>
              <Text style={styles.addImageLabel}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmittingProduct && styles.submitButtonDisabled]}
        onPress={handleSubmitProductReview}
        disabled={isSubmittingProduct}
      >
        {isSubmittingProduct ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Review</Text>
        )}
      </TouchableOpacity>
    </>
  )

  const renderSupplierReview = () => (
    <>
      {renderStarRating(qualityRating, setQualityRating, 'Product Quality')}
      {renderStarRating(deliveryRating, setDeliveryRating, 'Delivery Speed')}
      {renderStarRating(communicationRating, setCommunicationRating, 'Communication')}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Review</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share your experience with this supplier..."
          value={supplierComment}
          onChangeText={setSupplierComment}
          multiline
          numberOfLines={6}
          maxLength={500}
        />
        <Text style={styles.charCount}>{supplierComment.length}/500</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmittingSupplier && styles.submitButtonDisabled]}
        onPress={handleSubmitSupplierReview}
        disabled={isSubmittingSupplier}
      >
        {isSubmittingSupplier ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Review</Text>
        )}
      </TouchableOpacity>
    </>
  )

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {reviewType === 'product' ? 'Review Product' : 'Review Supplier'}
        </Text>
        {reviewType === 'product' ? renderProductReview() : renderSupplierReview()}
      </ScrollView>
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
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 24,
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  textArea: {
    height: 120,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: '#F9F9F9',
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  imageScroll: {
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  addImageText: {
    fontSize: 32,
    color: '#999999',
  },
  addImageLabel: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  submitButton: {
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
