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

// A tenant company as seen by a super admin, carrying rollup counts from the
// management endpoints (GET /tenants).
export interface TenantCompany extends Tenant {
  users_count?: number;
  vehicles_count?: number;
  schedules_count?: number;
  bookings_count?: number;
}

// POST /tenants — create a company and, optionally, its first admin user.
export interface TenantCreatePayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_email?: string;
  admin_phone?: string | null;
  admin_password?: string;
}

// PATCH /tenants/{id}
export interface TenantUpdatePayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  status?: "active" | "inactive";
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

// ---------------------------------------------------------------------------
// Scheduled trips (concrete, dated trips derived from schedules / groups)
// ---------------------------------------------------------------------------

export type ScheduledTripStatus =
  | "not_started"
  | "ongoing"
  | "completed"
  | "cancelled";

export interface ScheduledTrip {
  id: number;
  // Where the trip came from: a one-off Schedule or a recurring ScheduleGroup.
  source: ScheduleType;
  schedule_group_id?: number | null;
  travel_date?: string | null;
  departure_time: string;
  arrival_time: string;
  fare: number | string;
  // Operational lifecycle of the trip itself.
  trip_status: ScheduledTripStatus;
  // Publishing status (e.g. "scheduled", "cancelled").
  status?: string | null;
  seat_selection_enabled?: boolean;
  seat_arrangement?: {
    id: number;
    name: string;
    number_of_seats: number;
  } | null;
  capacity?: number | null;
  booked_seats?: number;
  available_seats?: number;
  passenger_count?: number;
  checked_in_count?: number;
  not_checked_in_count?: number;
  route?: EmbeddedRoute | null;
  vehicle_type?: { id: number; vehicle_name: string } | null;
  assignment?: TripAssignment | null;
  operator?: Operator | null;
}

// Vehicle + driver currently assigned to a trip.
export interface TripAssignment {
  assigned: boolean;
  assigned_at?: string | null;
  vehicle?: {
    id: number;
    registration_number?: string | null;
    vehicle_type?: string | null;
    status?: string | null;
  } | null;
  driver?: {
    id: number;
    name: string;
    phone?: string | null;
    licence_number?: string | null;
    availability?: DriverAvailability;
    trips_completed?: number;
  } | null;
}

// PATCH /scheduled-trips/{id}/assignment
export interface AssignTripPayload {
  vehicle_id: number;
  driver_id: number;
}

// A trip as listed under a driver's record (compact view).
export interface DriverTrip {
  id: number;
  source: ScheduleType;
  travel_date?: string | null;
  departure_time: string;
  arrival_time: string;
  trip_status: ScheduledTripStatus;
  fare: number | string;
  capacity?: number | null;
  booked_seats?: number;
  route?: EmbeddedRoute | null;
  vehicle?: { id: number; registration_number?: string | null } | null;
  vehicle_type?: { id: number; vehicle_name: string } | null;
}

// GET /drivers/{id}/trips
export interface DriverTripsResult {
  counts: { assigned: number; ongoing: number; completed: number };
  trips: DriverTrip[];
}

// A single passenger on a trip's manifest.
export interface TripPassenger {
  booking_id: number;
  booking_reference?: string | null;
  ticket_code?: string | null;
  name: string;
  phone?: string | null;
  seat_number?: number | null;
  checked_in: boolean;
  ticket_status?: string | null;
}

// GET /scheduled-trips/{id}/passengers
export interface TripManifest {
  id: number;
  travel_date?: string | null;
  trip_status: ScheduledTripStatus;
  passenger_count: number;
  checked_in_count: number;
  not_checked_in_count: number;
  passengers: TripPassenger[];
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

// GET /bookings/summary — dashboard aggregates.
export interface BookingSummary {
  total_bookings: number;
  // Value of live bookings (excludes cancelled & expired).
  total_amount: number | string;
  // Sum of confirmed bookings only (realised revenue).
  confirmed_amount: number | string;
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

export type DriverStatus = "active" | "inactive";

// Operational availability, distinct from the active/inactive account status.
export type DriverAvailability = "available" | "on_trip" | "unavailable";

export interface Driver {
  id: number;
  tenant_id?: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  licence_number?: string | null;
  status: DriverStatus;
  availability: DriverAvailability;
  // Running count of trips this driver has completed (system-managed).
  trips_completed?: number;
  created_at?: string;
}

export interface DriverPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  licence_number?: string | null;
  status?: DriverStatus;
  availability?: DriverAvailability;
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
