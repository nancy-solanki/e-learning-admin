import type { ReactNode, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

const Icon = ({
  className,
  children,
  ...props
}: IconProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="5.75" />
    <path d="M16 16l4.5 4.5" />
  </Icon>
);
export const FullscreenIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
    <path d="M4 4l5 5M20 4l-5 5M20 20l-5-5M4 20l5-5" />
  </Icon>
);
export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8.5 17.5h7l-1-2.6V10a3.5 3.5 0 1 0-7 0v4.9l-1 2.6Z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </Icon>
);
export const ArrowDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 10.5 12 15l5-4.5" />
  </Icon>
);
export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2h-3.5v-7h-5v7H6a2 2 0 0 1-2-2v-7.5Z" />
  </Icon>
);
export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M16 18v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M18.5 9.3a3 3 0 1 1 0 5.4M20 18.3v-.8a3 3 0 0 0-2.1-2.9" />
  </Icon>
);
export const CategoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
    <path d="M8 9h8M8 12h8M8 15h5" />
  </Icon>
);
export const BookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5.5 5.5A2.5 2.5 0 0 1 8 3h10.5v15H8a2.5 2.5 0 0 0-2.5 2.5V5.5Z" />
    <path d="M5.5 5.5A2.5 2.5 0 0 0 3 8v11.5A2.5 2.5 0 0 1 5.5 18H18" />
  </Icon>
);
export const LayersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3 8 4-8 4-8-4 8-4Z" />
    <path d="m4 10 8 4 8-4M4 14l8 4 8-4" />
  </Icon>
);
export const LectureIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 17 18H7a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
    <path d="M10 8.5 15.5 12 10 15.5v-7Z" />
  </Icon>
);
export const StarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3.5 2.5 5.1 5.6.8-4 3.9 1 5.5L12 0 6.9 18.8l1-5.5-4-3.9 5.6-.8L12 3.5Z" />
  </Icon>
);
export const WalletIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v8.5A2.5 2.5 0 0 1 17.5 19h-12A2.5 2.5 0 0 1 3 16.5v-6A2.5 2.5 0 0 1 5.5 8H18" />
    <path d="M15.5 13h4.5v2.5h-4.5a1.5 1.5 0 1 1 0-3Z" />
  </Icon>
);
export const CouponIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v2.3a2 2 0 0 0 0 4l-1.5.9a2.5 2.5 0 0 1-2.8-.4l-.8-.8a2 2 0 0 0-2.8 0l-.8.8c-.8.8-2.1 1-3.2.5L5 16.3a2 2 0 0 1-.5-3.1V8.5Z" />
    <path d="M9 10h6M9 14h6" />
  </Icon>
);
export const OrderIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 7.5h14l-1.2 11.2A2 2 0 0 1 15.8 20H8.2a2 2 0 0 1-2-1.3L5 7.5Z" />
    <path d="M9 7V6a3 3 0 1 1 6 0v1" />
  </Icon>
);
export const EnrollmentIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5.5 7A2.5 2.5 0 0 1 8 4.5h8A2.5 2.5 0 0 1 18.5 7v10A2.5 2.5 0 0 1 16 19.5H8A2.5 2.5 0 0 1 5.5 17V7Z" />
    <path d="M9 7.5h6M9 12h6M9 16h4" />
  </Icon>
);
export const GearIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.7v2.1M12 18.2v2.1M4.8 12h2.1m10.2 0h2.1M6.7 6.7l1.5 1.5m8.4 8.4 1.5 1.5M17.3 6.7l-1.5 1.5m-8.4 8.4-1.5 1.5M12 8.7a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Z" />
  </Icon>
);
export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.8 12h16.4M12 3.5a14.4 14.4 0 0 1 0 17M12 3.5a14.4 14.4 0 0 0 0 17" />
  </Icon>
);
export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 7 5 5-5 5" />
  </Icon>
);
