import type { ComponentType, SVGProps } from 'react';

import {
  BankIcon,
  BookIcon,
  CategoryIcon,
  CouponIcon,
  EnrollmentIcon,
  GearIcon,
  GlobeIcon,
  HomeIcon,
  LayersIcon,
  LectureIcon,
  OrderIcon,
  StarIcon,
  UsersIcon,
  WalletIcon,
} from '../components/icons/AdminIcons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavigationItem = {
  label: string;
  icon: Icon;
  submenu?: (string | { label: string; path: string })[];
  path?: string;
};

export const mainNavigation: NavigationItem[] = [
  { label: 'Home', icon: HomeIcon },
];

export const adminNavigation: NavigationItem[] = [
  { label: 'Users', icon: UsersIcon, path: '/users' },
  { label: 'Category', icon: CategoryIcon, path: '/categories' },
  { label: 'Courses', icon: BookIcon, path: '/courses' },
  { label: 'Sections', icon: LayersIcon, path: '/sections' },
  { label: 'Lectures', icon: LectureIcon, path: '/lectures' },
  { label: 'Ratings', icon: StarIcon, path: '/ratings' },
  { label: 'Wallets', icon: WalletIcon, path: '/wallets' },
  { label: 'Coupons', icon: CouponIcon, path: '/coupons' },
  {
    label: 'Orders',
    icon: OrderIcon,
    submenu: ['All Orders', 'Paid Orders', 'Rejected Orders'],
  },
  { label: 'Enrollments', icon: EnrollmentIcon, path: '/enrollments' },
  { label: 'Other', icon: GearIcon, submenu: ['All Payment Transactions'] },
  {
    label: 'Site',
    icon: GlobeIcon,
    submenu: [
      'Settings',
      { label: 'Localizations', path: '/localizations' },
      'Pages',
    ],
  },
];

export const instructorNavigation: NavigationItem[] = [
  { label: 'Courses', icon: BookIcon, path: '/courses' },
  { label: 'Ratings', icon: StarIcon, path: '/ratings' },
  { label: 'Coupons', icon: CouponIcon, path: '/coupons' },
  { label: 'Enrollments', icon: EnrollmentIcon, path: '/enrollments' },
  { label: 'Bank Account', icon: BankIcon, path: '/wallets' },
];
