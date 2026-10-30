import {
  LayoutDashboard,
  CalendarClock,
  Ticket,
  Bus,
  Route as RouteIcon,
  MapPin,
  Layers,
  Armchair,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** exact match only (used for the dashboard root) */
  exact?: boolean;
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
      { label: "Bookings", href: "/bookings", icon: Ticket },
      { label: "Vehicles", href: "/vehicles", icon: Bus },
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
];
