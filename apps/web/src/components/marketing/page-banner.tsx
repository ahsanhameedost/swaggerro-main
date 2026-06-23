import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/**
 * Full-width brand-colored banner for app/checkout pages (cart, project-submission, …).
 * Shows the page title with a breadcrumb trail beneath it.
 */
export function PageBanner({
  title,
  subtitle,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs: Crumb[];
}) {
  return (
    <section className="bg-primary/90">
      <div className="container py-9 lg:py-11">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-white/80">{subtitle}</p> : null}
        <Breadcrumbs items={breadcrumbs} tone="onBrand" className="mt-3" />
      </div>
    </section>
  );
}
