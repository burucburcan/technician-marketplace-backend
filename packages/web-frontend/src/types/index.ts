// Core types for the application
export enum UserRole {
  ADMIN = 'admin',
  PROVIDER = 'provider',
  PROFESSIONAL = 'professional',
  USER = 'user',
}

export enum ProfessionalType {
  HANDYMAN = 'handyman',
  ARTIST = 'artist',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  language: 'es' | 'en';
}

export interface ProfessionalProfile {
  id: string;
  userId: string;
  professionalType: ProfessionalType;
  businessName?: string;
  specializations: string[];
  experienceYears: number;
  hourlyRate: number;
  rating: number;
  totalJobs: number;
  portfolio?: PortfolioItem[];
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  category: string;
}

export interface Booking {
  id: string;
  userId: string;
  professionalId: string;
  professionalType: ProfessionalType;
  serviceCategory: string;
  status: BookingStatus;
  scheduledDate: Date;
  estimatedDuration: number;
  description: string;
  estimatedPrice: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Product and Supplier types
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface SupplierProfile {
  id: string;
  userId: string;
  companyName: string;
  taxId: string;
  businessAddress: Location;
  contactPhone: string;
  contactEmail: string;
  logo?: string;
  description?: string;
  rating: number;
  totalOrders: number;
  responseRate: number;
}

export interface ProductSpecification {
  key: string;
  value: string;
  unit?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  thumbnailUrl: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stockQuantity: number;
  isAvailable: boolean;
  images: ProductImage[];
  specifications: ProductSpecification[];
  brand?: string;
  model?: string;
  rating: number;
  totalReviews: number;
  supplier?: SupplierProfile;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  currency: string;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  supplierId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
  status: OrderStatus;
  shippingAddress: Location;
  billingAddress: Location;
  paymentMethod: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductReview {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
}

export interface SupplierReview {
  id: string;
  orderId: string;
  userId: string;
  supplierId: string;
  productQualityRating: number;
  deliverySpeedRating: number;
  communicationRating: number;
  overallRating: number;
  comment: string;
  createdAt: Date;
}

export interface ProductSearchQuery {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  supplierId?: string;
  inStock?: boolean;
  sortBy?: 'price' | 'rating' | 'popularity' | 'newest';
  page?: number;
  pageSize?: number;
}

export interface ProductSearchResults {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}
