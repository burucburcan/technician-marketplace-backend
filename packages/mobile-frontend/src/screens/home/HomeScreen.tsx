import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native'
import { useDispatch } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { useSearchProfessionalsQuery } from '../../store/api/searchApi'
import { ProfessionalType } from '../../types'
import Button from '../../components/Button'

const HomeScreen: React.FC = () => {
  const dispatch = useDispatch()
  const [selectedType, setSelectedType] = useState<ProfessionalType | null>(
    null
  )

  const { data, isLoading } = useSearchProfessionalsQuery(
    {
      professionalType: selectedType || undefined,
    },
    { skip: !selectedType }
  )

  const handleLogout = () => {
    dispatch(logout())
  }

  const renderProfessionalCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.businessName || 'Professional'}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>
        {item.professionalType === ProfessionalType.ARTIST ? 'Artist' : 'Handyman'}
      </Text>
      <Text style={styles.cardDescription}>
        {item.specializations.join(', ')}
      </Text>
      <Text style={styles.cardPrice}>${item.hourlyRate}/hr</Text>
      {item.portfolio && item.portfolio.length > 0 && (
        <ScrollView horizontal style={styles.portfolioPreview}>
          {item.portfolio.slice(0, 3).map((img: any) => (
            <Image
              key={img.id}
              source={{ uri: img.thumbnailUrl }}
              style={styles.portfolioImage}
            />
          ))}
        </ScrollView>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Professionals</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === ProfessionalType.HANDYMAN && styles.typeButtonActive,
          ]}
          onPress={() => setSelectedType(ProfessionalType.HANDYMAN)}
        >
          <Text
            style={[
              styles.typeButtonText,
              selectedType === ProfessionalType.HANDYMAN &&
                styles.typeButtonTextActive,
            ]}
          >
            🔧 Handyman
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === ProfessionalType.ARTIST && styles.typeButtonActive,
          ]}
          onPress={() => setSelectedType(ProfessionalType.ARTIST)}
        >
          <Text
            style={[
              styles.typeButtonText,
              selectedType === ProfessionalType.ARTIST &&
                styles.typeButtonTextActive,
            ]}
          >
            🎨 Artist
          </Text>
        </TouchableOpacity>
      </View>

      {!selectedType ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Select a professional type to start searching
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={data?.professionals || []}
          renderItem={renderProfessionalCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No professionals found</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  logoutText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  portfolioPreview: {
    flexDirection: 'row',
    marginTop: 8,
  },
  portfolioImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
})

export default HomeScreen
