/**
 * Mock data for Order-related tests.
 * Provides consistent test data for unit and integration tests.
 */

export const mockCustomer = {
  id: 'customer-uuid-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
};

export const mockVendor = {
  id: 'vendor-uuid-456',
  name: 'Vendor Inc',
  email: 'vendor@example.com',
  phone: '+0987654321',
};

export const mockAddress = {
  id: 'address-uuid-789',
  label: 'Home',
  street: '123 Main St',
  city: 'Test City',
  state: 'Test State',
  zip_code: '12345',
};

export const mockProduct = {
  id: 'product-uuid-101',
  name: 'Water Jar',
  description: 'A large water jar',
  price: 25.00,
  is_active: true,
};

export const mockOrder = {
  id: 'order-uuid-123',
  customer_id: mockCustomer.id,
  vendor_id: mockVendor.id,
  address_id: mockAddress.id,
  product_id: mockProduct.id,
  qty: 2,
  total_amount: 50.00,
  status: 'PENDING',
  payment_status: 'PENDING',
  assigned_rider_phone: '+1122334455',
  created_at: new Date('2023-12-01T10:00:00.000Z'),
  updated_at: new Date('2023-12-01T10:00:00.000Z'),
  customer: mockCustomer,
  vendor: mockVendor,
  address: mockAddress,
  product: mockProduct,
};

export const mockCreateOrderDto = {
  customer_id: mockCustomer.id,
  vendor_id: mockVendor.id,
  address_id: mockAddress.id,
  product_id: mockProduct.id,
  qty: 2,
  total_amount: 50.00,
  status: 'PENDING',
  payment_status: 'PENDING',
  assigned_rider_phone: '+1122334455',
};

export const mockUpdateOrderDto = {
  status: 'CONFIRMED',
  payment_status: 'PAID',
  assigned_rider_phone: '+5566778899',
};

export const mockOrderList = [
  mockOrder,
  {
    ...mockOrder,
    id: 'order-uuid-456',
    qty: 1,
    total_amount: 25.00,
    status: 'COMPLETED',
    payment_status: 'PAID',
  },
];

export const mockMinimalOrder = {
  id: 'order-uuid-minimal',
  customer_id: null,
  vendor_id: null,
  address_id: null,
  product_id: null,
  qty: 1,
  total_amount: 25.00,
  status: 'PENDING',
  payment_status: 'PENDING',
  assigned_rider_phone: null,
  created_at: new Date(),
  updated_at: new Date(),
  customer: null,
  vendor: null,
  address: null,
  product: null,
};