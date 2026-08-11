import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  path?: string;
}

interface MarketingBreadcrumbProps {
  items: Crumb[];
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * MarketingBreadcrumb — shared breadcrumb for public SEO pages.
 * Renders Router <Link>s with a JSON-LD-friendly, accessible ol structure.
 * tone="light" for use inside the emerald hero bands.
 */
const MarketingBreadcrumb: React.FC<MarketingBreadcrumbProps> = ({ items, tone = 'dark', className }) => (
  <Breadcrumb
    className={cn(
      'mb-4 text-sm',
      tone === 'light' && '[&_a]:text-emerald-100/80 [&_a:hover]:text-white [&_span[role=link]]:text-emerald-50',
      className
    )}
  >
    <BreadcrumbList className="text-muted-foreground">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <BreadcrumbSeparator className={tone === 'light' ? '[&>svg]:text-emerald-200/50' : undefined} />
            )}
            <BreadcrumbItem>
              {item.path && !isLast ? (
                <BreadcrumbLink asChild>
                  <Link to={item.path}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className={cn(tone === 'light' && 'font-medium text-emerald-50')}>
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        );
      })}
    </BreadcrumbList>
  </Breadcrumb>
);

export default MarketingBreadcrumb;
