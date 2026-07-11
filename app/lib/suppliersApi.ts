import { apiUrl, readApiError } from './productsApi';

export interface ApiSupplier {
  _id: string;
  name: string;
  contactPerson?: string;
  category: string;
  phone?: string;
  email?: string;
  cityRegion?: string;
  status: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export function supplierResourceUrl(id: string): string {
  return apiUrl(`/api/suppliers/${encodeURIComponent(id)}`);
}

export function mapApiSupplierRow(p: ApiSupplier) {
  return {
    id: p._id,
    name: p.name,
    contactPerson: p.contactPerson,
    phone: p.phone,
    email: p.email,
    category: p.category,
    location: p.cityRegion,
    address: p.address,
    status: (p.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    notes: p.notes,
  };
}
