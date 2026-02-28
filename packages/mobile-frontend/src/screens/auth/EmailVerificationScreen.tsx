import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../../navigation/AppNavigator'
import { useVerifyEmailMutation } from '../../store/api/authApi'
import Input from '../../components/Input'
import Button from '../../components/Button'

type EmailVerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailVerification'
>

const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation<EmailVerificationScreenNavigationProp>()
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation()

  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  const handleVerify = async () => {
    if (!token) {
      setError('Verification code is required')
      return
    }

    try {
      await verifyEmail({ token }).unwrap()
      Alert.alert(
        'Email Verified',
        'Your email has been successfully verified. You can now sign in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      )
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error?.data?.message || 'Invalid or expired verification code'
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            Enter the verification code sent to your email
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Verification Code"
            placeholder="Enter verification code"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            error={error}
          />

          <Button
            title="Verify Email"
            onPress={handleVerify}
            loading={isLoading}
            style={styles.verifyButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  verifyButton: {
    marginTop: 8,
  },
})

export default EmailVerificationScreen
