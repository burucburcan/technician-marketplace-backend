import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useGetCartQuery, useCreateOrderMutation } from '../../store/api/productApi'
import type { Location } from '../../types'

interface CheckoutScreenProps {
  navigation: any
}

type CheckoutStep = 'address' | 'payment' | 'summary'

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address')
  const [shippingAddress, setShippingAddress] = useState<Partial<Location>>({
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  })
  const [billingAddress, setBillingAddress] = useState<Partial<Location>>({
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  })
  const [useSameAddress, setUseSameAddress] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  const { data: cart } = useGetCartQuery()
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation()

  const validateAddress = useCallback((address: Partial<Location>) => {
    return (
      address.address &&
      address.city &&
      address.state &&
      address.country &&
      address.postalCode
    )
  }, [])

  const handleNextStep = useCallback(() => {
    if (currentStep === 'address') {
      if (!validateAddress(shippingAddress)) {
        Alert.alert('Invalid Address', 'Please fill in all shipping address fields')
        return
      }
      if (!useSameAddress && !validateAddress(billingAddress)) {
        Alert.alert('Invalid Address', 'Please fill in all billing address fields')
        return
      }
      setCurrentStep('payment')
    } else if (currentStep === 'payment') {
      if (paymentMethod === 'card') {
        if (!cardNumber || !cardExpiry || !cardCvv) {
          Alert.alert('Invalid Payment', 'Please fill in all card details')
          return
        }
      }
      setCurrentStep('summary')
    }
  }, [currentStep, shippingAddress, billingAddress, useSameAddress, paymentMethod, cardNumber, cardExpiry, cardCvv, validateAddress])

  const handlePlaceOrder = useCallback(async () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty')
      return
    }

    try {
      const orderData = {
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: shippingAddress as Location,
        billingAddress: useSameAddress ? (shippingAddress as Location) : (billingAddress as Location),
        paymentMethod,
        notes: orderNotes,
      }

      const order = await createOrder(orderData).unwrap()
      Alert.alert('Success', 'Order placed successfully!', [
        {
          text: 'View Order',
          onPress: () => navigation.replace('OrderTracking', { orderId: order.id }),
        },
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.')
    }
  }, [cart, shippingAddress, billingAddress, useSameAddress, paymentMethod, orderNotes, createOrder, navigation])

  const renderAddressStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Shipping Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Street Address"
        value={shippingAddress.address}
        onChangeText={(text) => setShippingAddress({ ...shippingAddress, address: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        value={shippingAddress.city}
        onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="State"
          value={shippingAddress.state}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, state: text })}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Postal Code"
          value={shippingAddress.postalCode}
          onChangeText={(text) => setShippingAddress({ ...shippingAddress, postalCode: text })}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Country"
        value={shippingAddress.country}
        onChangeText={(text) => setShippingAddress({ ...shippingAddress, country: text })}
      />

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setUseSameAddress(!useSameAddress)}
      >
        <View style={[styles.checkbox, useSameAddress && styles.checkboxChecked]}>
          {useSameAddress && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>Billing address same as shipping</Text>
      </TouchableOpacity>

      {!useSameAddress && (
        <>
          <Text style={styles.stepTitle}>Billing Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            value={billingAddress.address}
            onChangeText={(text) => setBillingAddress({ ...billingAddress, address: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            value={billingAddress.city}
            onChangeText={(text) => setBillingAddress({ ...billingAddress, city: text })}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="State"
              value={billingAddress.state}
              onChangeText={(text) => setBillingAddress({ ...billingAddress, state: text })}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Postal Code"
              value={billingAddress.postalCode}
              onChangeText={(text) => setBillingAddress({ ...billingAddress, postalCode: text })}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Country"
            value={billingAddress.country}
            onChangeText={(text) => setBillingAddress({ ...billingAddress, country: text })}
          />
        </>
      )}
    </View>
  )

  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Method</Text>
      <View style={styles.paymentMethods}>
        <TouchableOpacity
          style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
          onPress={() => setPaymentMethod('card')}
        >
          <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>
            Credit/Debit Card
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.paymentMethod, paymentMethod === 'cash' && styles.paymentMethodActive]}
          onPress={() => setPaymentMethod('cash')}
        >
          <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.paymentMethodTextActive]}>
            Cash on Delivery
          </Text>
        </TouchableOpacity>
      </View>

      {paymentMethod === 'card' && (
        <>
          <Text style={styles.stepTitle}>Card Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Card Number"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            maxLength={16}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="MM/YY"
              value={cardExpiry}
              onChangeText={setCardExpiry}
              maxLength={5}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="CVV"
              value={cardCvv}
              onChangeText={setCardCvv}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
            />
          </View>
        </>
      )}
    </View>
  )

  const renderSummaryStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Order Summary</Text>
      
      {/* Products */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Products</Text>
        {cart?.items.map((item) => (
          <View key={item.id} style={styles.summaryItem}>
            <Text style={styles.summaryItemName}>
              {item.product.name} x {item.quantity}
            </Text>
            <Text style={styles.summaryItemPrice}>
              ${item.subtotal.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Addresses */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <Text style={styles.summaryText}>
          {shippingAddress.address}, {shippingAddress.city}, {shippingAddress.state}{' '}
          {shippingAddress.postalCode}, {shippingAddress.country}
        </Text>
      </View>

      {/* Payment */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <Text style={styles.summaryText}>
          {paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash on Delivery'}
        </Text>
      </View>

      {/* Order Notes */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add any special instructions..."
          value={orderNotes}
          onChangeText={setOrderNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Total */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>${cart?.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping:</Text>
          <Text style={styles.totalValue}>$10.00</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax:</Text>
          <Text style={styles.totalValue}>$5.00</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Total:</Text>
          <Text style={styles.grandTotalValue}>
            ${((cart?.total || 0) + 15).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, currentStep === 'address' && styles.progressDotActive]} />
          <Text style={[styles.progressLabel, currentStep === 'address' && styles.progressLabelActive]}>
            Address
          </Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, currentStep === 'payment' && styles.progressDotActive]} />
          <Text style={[styles.progressLabel, currentStep === 'payment' && styles.progressLabelActive]}>
            Payment
          </Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, currentStep === 'summary' && styles.progressDotActive]} />
          <Text style={[styles.progressLabel, currentStep === 'summary' && styles.progressLabelActive]}>
            Summary
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView}>
        {currentStep === 'address' && renderAddressStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'summary' && renderSummaryStep()}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {currentStep !== 'address' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentStep === 'payment') setCurrentStep('address')
              else if (currentStep === 'summary') setCurrentStep('payment')
            }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, currentStep === 'address' && styles.nextButtonFull]}
          onPress={currentStep === 'summary' ? handlePlaceOrder : handleNextStep}
          disabled={isCreatingOrder}
        >
          {isCreatingOrder ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === 'summary' ? 'Place Order' : 'Next'}
            </Text>
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999999',
  },
  progressLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
    marginTop: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333333',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  paymentMethodActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666666',
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryItemName: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  totalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  backButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  nextButton: {
    flex: 2,
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
