import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native'
import { useGetOrderQuery, useCancelOrderMutation } from '../../store/api/productApi'
import { OrderStatus } from '../../types'

interface OrderTrackingScreenProps {
  route: any
  navigation: any
}

const STATUS_STEPS = [
  { key: OrderStatus.PENDING, label: 'Pending', icon: '⏳' },
  { key: OrderStatus.CONFIRMED, label: 'Confirmed', icon: '✓' },
  { key: OrderStatus.PREPARING, label: 'Preparing', icon: '📦' },
  { key: OrderStatus.SHIPPED, label: 'Shipped', icon: '🚚' },
  { key: OrderStatus.DELIVERED, label: 'Delivered', icon: '✓' },
]

export const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ route, navigation }) => {
  const { orderId } = route.params
  const [showAddresses, setShowAddresses] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data: order, isLoading, refetch, isFetching } = useGetOrderQuery(orderId)
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation()

  const handleTrackShipment = useCallback(() => {
    if (order?.trackingNumber && order?.carrier) {
      // Open carrier tracking URL (simplified)
      const trackingUrl = `https://www.google.com/search?q=${order.carrier}+tracking+${order.trackingNumber}`
      Linking.openURL(trackingUrl)
    }
  }, [order])

  const handleCancelOrder = useCallback(async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation')
      return
    }

    try {
      await cancelOrder({ orderId, reason: cancelReason }).unwrap()
      setShowCancelModal(false)
      Alert.alert('Success', 'Order cancelled successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel order')
    }
  }, [orderId, cancelReason, cancelOrder])

  const handleReview = useCallback(() => {
    navigation.navigate('ProductReview', { orderId })
  }, [orderId, navigation])

  const getStatusIndex = useCallback((status: OrderStatus) => {
    return STATUS_STEPS.findIndex((step) => step.key === status)
  }, [])

  const renderStatusTimeline = useCallback(() => {
    if (!order) return null

    const currentIndex = getStatusIndex(order.status)
    const isCancelled = order.status === OrderStatus.CANCELLED

    if (isCancelled) {
      return (
        <View style={styles.cancelledContainer}>
          <Text style={styles.cancelledIcon}>❌</Text>
          <Text style={styles.cancelledText}>Order Cancelled</Text>
        </View>
      )
    }

    return (
      <View style={styles.timeline}>
        {STATUS_STEPS.map((step, index) => {
          const isActive = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineIcon, isActive && styles.timelineIconActive]}>
                  <Text style={styles.timelineIconText}>{step.icon}</Text>
                </View>
                {index < STATUS_STEPS.length - 1 && (
                  <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />
                )}
              </View>
              <View style={styles.timelineRight}>
                <Text style={[styles.timelineLabel, isCurrent && styles.timelineLabelActive]}>
                  {step.label}
                </Text>
                {isCurrent && (
                  <Text style={styles.timelineDate}>
                    {new Date(order.updatedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          )
        })}
      </View>
    )
  }, [order, getStatusIndex])

  if (isLoading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED
  const canReview = order.status === OrderStatus.DELIVERED

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        {/* Order Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <View style={[styles.statusBadge, styles[`status${order.status}`]]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.orderTotal}>
            Total: {order.currency} ${order.total.toFixed(2)}
          </Text>
        </View>

        {/* Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status</Text>
          {renderStatusTimeline()}
        </View>

        {/* Products */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Products</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.productItem}>
              <Image
                source={{ uri: item.productImage }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.productQuantity}>Qty: {item.quantity}</Text>
                <Text style={styles.productPrice}>
                  ${item.price.toFixed(2)} × {item.quantity} = ${item.subtotal.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Shipping Tracking */}
        {order.trackingNumber && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shipping Information</Text>
            <View style={styles.trackingInfo}>
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Carrier:</Text>
                <Text style={styles.trackingValue}>{order.carrier}</Text>
              </View>
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Tracking Number:</Text>
                <Text style={styles.trackingValue}>{order.trackingNumber}</Text>
              </View>
              {order.estimatedDelivery && (
                <View style={styles.trackingRow}>
                  <Text style={styles.trackingLabel}>Estimated Delivery:</Text>
                  <Text style={styles.trackingValue}>
                    {new Date(order.estimatedDelivery).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.trackButton} onPress={handleTrackShipment}>
              <Text style={styles.trackButtonText}>Track Shipment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Addresses */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowAddresses(!showAddresses)}
          >
            <Text style={styles.cardTitle}>Addresses</Text>
            <Text style={styles.collapseIcon}>{showAddresses ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {showAddresses && (
            <>
              <View style={styles.addressSection}>
                <Text style={styles.addressTitle}>Shipping Address</Text>
                <Text style={styles.addressText}>
                  {order.shippingAddress.address}
                  {'\n'}
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                  {'\n'}
                  {order.shippingAddress.country}
                </Text>
              </View>
              <View style={styles.addressSection}>
                <Text style={styles.addressTitle}>Billing Address</Text>
                <Text style={styles.addressText}>
                  {order.billingAddress.address}
                  {'\n'}
                  {order.billingAddress.city}, {order.billingAddress.state}{' '}
                  {order.billingAddress.postalCode}
                  {'\n'}
                  {order.billingAddress.country}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal:</Text>
            <Text style={styles.priceValue}>${order.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping:</Text>
            <Text style={styles.priceValue}>${order.shippingCost.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax:</Text>
            <Text style={styles.priceValue}>${order.tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCancelModal(true)}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
          {canReview && (
            <TouchableOpacity style={styles.reviewButton} onPress={handleReview}>
              <Text style={styles.reviewButtonText}>Write Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Cancel Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for cancellation:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statuspending: { backgroundColor: '#FFF3E0' },
  statusconfirmed: { backgroundColor: '#E3F2FD' },
  statuspreparing: { backgroundColor: '#F3E5F5' },
  statusshipped: { backgroundColor: '#E8F5E9' },
  statusdelivered: { backgroundColor: '#C8E6C9' },
  statuscancelled: { backgroundColor: '#FFEBEE' },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textTransform: 'capitalize',
  },
  orderDate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  timeline: {
    paddingVertical: 8,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconActive: {
    backgroundColor: '#007AFF',
  },
  timelineIconText: {
    fontSize: 20,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  timelineLineActive: {
    backgroundColor: '#007AFF',
  },
  timelineRight: {
    flex: 1,
    paddingTop: 8,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  timelineLabelActive: {
    color: '#007AFF',
    fontSize: 16,
  },
  timelineDate: {
    fontSize: 12,
    color: '#999999',
  },
  cancelledContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cancelledIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cancelledText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F44336',
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
    color: '#999999',
  },
  trackingInfo: {
    marginBottom: 12,
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackingLabel: {
    fontSize: 14,
    color: '#666666',
  },
  trackingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  trackButton: {
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  collapseIcon: {
    fontSize: 12,
    color: '#666666',
  },
  addressSection: {
    marginBottom: 16,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  cancelButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  reviewButton: {
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  modalInput: {
    height: 100,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalConfirmButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#F44336',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
