import type { ComponentProps } from 'react';
import { PageHeading } from '../ui/PageHeading';

export function RatingsPageHeading(
  props: Omit<ComponentProps<typeof PageHeading>, 'eyebrow'>,
) {
  return <PageHeading {...props} eyebrow="Feedback moderation" />;
}
