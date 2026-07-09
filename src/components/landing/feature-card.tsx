import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights?: string[];
}

export function FeatureCard({ icon: Icon, title, description, highlights }: FeatureCardProps) {
  return (
    <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-border overflow-hidden h-full">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 mb-3">
          <div className="p-2.5 sm:p-3 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm sm:text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>

      {highlights && highlights.length > 0 && (
        <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <ul className="space-y-2.5 sm:space-y-2">
            {highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2.5 sm:gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                {highlight}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
