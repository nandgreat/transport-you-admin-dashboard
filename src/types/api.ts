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
  logo_url?: string | null;
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

export interface ScheduleSeat {
  number: number;
  available: boolean;
}

export interface Schedule {
  id: number;
  // "one_off" (a Schedule row) or "recurring" (a ScheduleGroup pattern),
  // both collapsed into the unified /schedules list.
  type?: "one_off" | "recurring";
  tenant_id?: number;
  departure_time: string;
  arrival_time: string;
  fare: number | string;
  status?: string | null;
  available_seats?: number | null;
  capacity?: number | null;
  is_round_trip?: boolean;
  route?: EmbeddedRoute | null;
  vehicle_type?: VehicleType | null;
  operator?: Operator | null;
  return_trip?: Schedule | null;
  // Seat arrangement / seat map (present on the detail endpoint).
  seat_arrangement?: {
    id: number;
    name: string;
    number_of_seats: number;
    arrangement_image?: string | null;
    description?: string | null;
  } | null;
  seat_arrangement_label?: string | null;
  seat_selection_enabled?: boolean;
  seats?: ScheduleSeat[];
  // Recurring-schedule fields
  days_of_week?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  schedule_end_date?: string | null;
  schedule_group_id?: number | null;
  // present only on creation payloads / legacy responses
  origin_city?: string;
  destination_city?: string;
  created_at?: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Passenger {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface BookingCustomer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

// The schedule summary embedded inside a booking (a subset of the full trip).
export interface BookingSchedule {
  id: number;
  departure_time: string;
  arrival_time: string;
  fare: number | string;
  status?: string | null;
  available_seats?: number | null;
  route?: EmbeddedRoute | null;
  vehicle_type?: {
    id: number;
    vehicle_name: string;
    capacity?: number | null;
  } | null;
}

export interface Booking {
  id: number;
  status: BookingStatus;
  total_amount: number | string;
  passengers: Passenger[];
  notes?: string | null;
  is_round_trip?: boolean;
  schedule?: BookingSchedule | null;
  customer?: BookingCustomer | null;
  operator?: Operator | null;
  return_booking?: Booking | null;
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

// A seat arrangement as returned nested on a vehicle type, carrying the
// many-to-many pivot (which one is the default).
export interface SeatArrangementTypeWithPivot extends SeatArrangementType {
  pivot?: {
    vehicle_type_id: number;
    seat_arrangement_type_id: number;
    is_default: boolean;
  };
}

export interface VehicleType {
  id: number;
  vehicle_name: string;
  description?: string | null;
  vehicle_category_id?: number | null;
  category?: VehicleCategory | null;
  // A vehicle type supports multiple seat arrangements, one marked default.
  seat_arrangement_types?: SeatArrangementTypeWithPivot[];
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

export interface SeatArrangementType {
  id: number;
  name: string;
  number_of_seats: number;
  arrangement_image?: string | null;
  description?: string | null;
  status?: string | null;
  vehicle_types_count?: number;
  created_at?: string;
}

export interface State {
  id: number;
  name: string;
  code?: string | null;
}

// POST /upload/images
export type UploadType =
  | "tenants"
  | "vehicles"
  | "profiles"
  | "routes"
  | "locations"
  | "schedules"
  | "misc";

export interface UploadResult {
  url: string;
  path: string;
  type: string;
}
