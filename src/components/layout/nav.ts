import {
  LayoutDashboard,
  CalendarClock,
  Navigation,
  Ticket,
  Bus,
  IdCard,
  Route as RouteIcon,
  MapPin,
  Layers,
  Armchair,
  Settings,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** exact match only (used for the dashboard root) */
  exact?: boolean;
  /** only visible to the global super admin */
  superAdmin?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Operations",
    items: [
      { label: "Schedules", href: "/schedules", icon: CalendarClock },
      { label: "Scheduled Trips", href: "/scheduled-trips", icon: Navigation },
      { label: "Bookings", href: "/bookings", icon: Ticket },
      { label: "Vehicles", href: "/vehicles", icon: Bus },
      { label: "Drivers", href: "/drivers", icon: IdCard },
      { label: "Routes", href: "/routes", icon: RouteIcon },
      { label: "Locations", href: "/locations", icon: MapPin },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Vehicle Types", href: "/vehicle-types", icon: Layers },
      { label: "Seat Arrangements", href: "/seat-arrangements", icon: Armchair },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Tenant Companies", href: "/tenants", icon: Building2, superAdmin: true },
    ],
  },
];
