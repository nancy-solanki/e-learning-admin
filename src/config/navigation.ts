import type { ComponentType, SVGProps } from 'react';

import {
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
  submenu?: string[];
  path?: string;
};

export const mainNavigation: NavigationItem[] = [
  { label: 'Home', icon: HomeIcon },
];

export const adminNavigation: NavigationItem[] = [
  { label: 'Users', icon: UsersIcon, path: '/users' },
  { label: 'Category', icon: CategoryIcon },
  {
    label: 'Courses',
    icon: BookIcon,
    submenu: [
      'All Courses',
      'Pending Courses',
      'Rejected Courses',
      'Published Courses',
      'Review Courses',
    ],
  },
  { label: 'Sections', icon: LayersIcon },
  {
    label: 'Lectures',
    icon: LectureIcon,
    submenu: [
      'All Lectures',
      'Rejected Lectures',
      'Approved Lectures',
      'Pending Lectures',
      'Published Lectures',
      'Draft Lectures',
    ],
  },
  { label: 'Ratings', icon: StarIcon },
  { label: 'Wallets', icon: WalletIcon },
  { label: 'Coupons', icon: CouponIcon },
  {
    label: 'Orders',
    icon: OrderIcon,
    submenu: ['All Orders', 'Paid Orders', 'Rejected Orders'],
  },
  { label: 'Enrollments', icon: EnrollmentIcon },
  { label: 'Other', icon: GearIcon, submenu: ['All Payment Transactions'] },
  {
    label: 'Site',
    icon: GlobeIcon,
    submenu: ['Settings', 'Localizations', 'Pages'],
  },
];

export const instructorNavigation: NavigationItem[] = [
  {
    label: 'Courses',
    icon: BookIcon,
    submenu: ['All Courses', 'Published Courses', 'Review Courses'],
  },
  { label: 'Sections', icon: LayersIcon },
  {
    label: 'Lectures',
    icon: LectureIcon,
    submenu: ['All Lectures', 'Published Lectures', 'Draft Lectures'],
  },
  { label: 'Ratings', icon: StarIcon },
  { label: 'Wallets', icon: WalletIcon },
];
