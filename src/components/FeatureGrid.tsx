import type { LucideIcon } from 'lucide-react';

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Three features side by side, under the home and download pages. */
export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
      {features.map(({ icon: Icon, title, description }) => (
        <div key={title} className="flex flex-col items-center text-center gap-2 p-4">
          <Icon className="w-8 h-8 text-primary" />
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-balance text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  );
}
