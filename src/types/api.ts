// ---------------------------------------------------------------------------
// Generic API envelope shapes
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  // The API returns a numeric HTTP-style status (e.g. 200); older docs
  // showed "success". Accept both — we rely on the axios HTTP status anyway.
  status: number | string;
  message?: string;
  data: T;
}

export interface Paginated<T> {
  current_page: number;
  data: T[];
  total: number;
  per_page: number;
  last_page: number;
  from: number | null;
  to: number | null;
  next_page_url: string | null;
  prev_page_url: string | null;
}

// ---------------------------------------------------------------------------
// Auth / user
// ---------------------------------------------------------------------------

// Roles come back as objects, e.g. { id, name: "admin", tenant_id, ... }.
export interface Role {
  id: number;
  name: string;
  tenant_id?: number | null;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status?: string | null;
  tenant_id: number | null;
  roles: Role[];
  tenant?: Tenant | null;
}

export interface Tenant {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface LoginResponse {
  // Real API returns `token`; some docs referenced `access_token`.
  token?: string;
  access_token?: string;
  token_type?: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export type ScheduleType = "one_off" | "recurring";

// A trimmed-down location as embedded inside a schedule's route.
export interface EmbeddedLocation {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
}

export interface EmbeddedRoute {
  id: number;
  distance?: string | number | null;
  estimated_duration?: number | null;
  origin?: EmbeddedLocation | null;
  destination?: EmbeddedLocation | null;
}

export interface Operator {
  id: number;
  name: string;
  logo_url?: string | null;
}

export interface Schedule {
  id: number;
  tenant_id?: number;
  departure_time: string;
  arrival_time: string;
  fare: number | string;
  status?: string | null;
  available_seats?: number | null;
  is_round_trip?: boolean;
  route?: EmbeddedRoute | null;
  vehicle_type?: VehicleType | null;
  operator?: Operator | null;
  return_trip?: Schedule | null;
  // present only on creation payloads / legacy responses
  origin_city?: string;
  destination_city?: string;
  days_of_week?: string[] | null;
  created_at?: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Booking {
  id: number;
  reference?: string | null;
  tenant_id: number;
  schedule_id: number;
  schedule?: Schedule | null;
  user_id?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  seats?: number | null;
  amount?: number | null;
  status: BookingStatus;
  created_at?: string;
}

export interface Vehicle {
  id: number;
  tenant_id: number;
  name?: string | null;
  registration_number?: string | null;
  plate_number?: string | null;
  vehicle_type_id: number;
  vehicle_type?: VehicleType | null;
  vehicle_category_id?: number | null;
  vehicle_category?: VehicleCategory | null;
  capacity?: number | null;
  image?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface Route {
  id: number;
  tenant_id?: number | null;
  origin_id?: number | null;
  destination_id?: number | null;
  origin?: Location | null;
  destination?: Location | null;
  distance?: number | string | null;
  estimated_duration?: number | null;
  status?: string | null;
  external_ref?: string | null;
  created_at?: string;
}

export interface Location {
  id: number;
  name: string;
  city?: string | null;
  state_id?: number | null;
  // `/locations` returns a nested state object; embedded routes return a string.
  state?: State | string | null;
  status_id?: number | null;
  address?: string | null;
  created_at?: string;
}

export interface VehicleType {
  id: number;
  vehicle_name: string;
  description?: string | null;
  vehicle_category_id?: number | null;
  category?: VehicleCategory | null;
  capacity?: number | null;
  year?: number | null;
  image_url?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface VehicleCategory {
  id: number;
  vehicle_category_name: string;
  description?: string | null;
  vehicle_types_count?: number;
  created_at?: string;
}

export interface State {
  id: number;
  name: string;
  code?: string | null;
}
