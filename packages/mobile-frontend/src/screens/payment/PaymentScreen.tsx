import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import Input from '../../components/Input'
import Button from '../../components/Button'

type InvoiceType = 'with_invoice' | 'without_invoice'

const PaymentScreen: React.FC = () => {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('without_invoice')
  const [invoiceData, setInvoiceData] = useState({
    taxId: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const subtotal = 100.0
  const taxRate = invoiceType === 'with_invoice' ? 0.16 : 0 // 16% IVA for Mexico
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const handlePayment = async () => {
    if (invoiceType === 'with_invoice') {
      if (!invoiceData.taxId || !invoiceData.companyName || !invoiceData.address) {
        Alert.alert('Error', 'Please fill in all invoice information')
        return
      }
    }

    setIsProcessing(true)
    
    // TODO: Integrate with Stripe SDK
    // const paymentIntent = await createPaymentIntent({
    //   amount: total,
    //   invoiceType,
    //   invoiceData: invoiceType === 'with_invoice' ? invoiceData : undefined,
    // })
    
    setTimeout(() => {
      setIsProcessing(false)
      Alert.alert('Success', 'Payment processed successfully!')
    }, 2000)
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Type</Text>
        <View style={styles.invoiceTypeContainer}>
          <TouchableOpacity
            style={[
              styles.invoiceTypeButton,
              invoiceType === 'without_invoice' && styles.invoiceTypeButtonActive,
            ]}
            onPress={() => setInvoiceType('without_invoice')}
          >
            <Text
              style={[
                styles.invoiceTypeText,
                invoiceType === 'without_invoice' && styles.invoiceTypeTextActive,
              ]}
            >
              Without Invoice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.invoiceTypeButton,
              invoiceType === 'with_invoice' && styles.invoiceTypeButtonActive,
            ]}
            onPress={() => setInvoiceType('with_invoice')}
          >
            <Text
              style={[
                styles.invoiceTypeText,
                invoiceType === 'with_invoice' && styles.invoiceTypeTextActive,
              ]}
            >
              With Invoice
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {invoiceType === 'with_invoice' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Information</Text>
          <Input
            label="Tax ID (RFC)"
            placeholder="Enter tax ID"
            value={invoiceData.taxId}
            onChangeText={(value) =>
              setInvoiceData({ ...invoiceData, taxId: value })
            }
          />
          <Input
            label="Company Name"
            placeholder="Enter company name"
            value={invoiceData.companyName}
            onChangeText={(value) =>
              setInvoiceData({ ...invoiceData, companyName: value })
            }
          />
          <Input
            label="Address"
            placeholder="Enter address"
            value={invoiceData.address}
            onChangeText={(value) =>
              setInvoiceData({ ...invoiceData, address: value })
            }
          />
          <Input
            label="City"
            placeholder="Enter city"
            value={invoiceData.city}
            onChangeText={(value) =>
              setInvoiceData({ ...invoiceData, city: value })
            }
          />
          <Input
            label="Postal Code"
            placeholder="Enter postal code"
            value={invoiceData.postalCode}
            onChangeText={(value) =>
              setInvoiceData({ ...invoiceData, postalCode: value })
            }
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        {invoiceType === 'with_invoice' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (IVA 16%):</Text>
            <Text style={styles.summaryValue}>${taxAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Button
          title="Process Payment"
          onPress={handlePayment}
          loading={isProcessing}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  invoiceTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  invoiceTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  invoiceTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  invoiceTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  invoiceTypeTextActive: {
    color: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
})

export default PaymentScreen

// TODO: Integrate with Stripe SDK (@stripe/stripe-react-native)
// TODO: Add payment method selection (card, bank transfer, etc.)
// TODO: Connect to payment API
// TODO: Handle payment errors and retries
