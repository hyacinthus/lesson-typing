import { useNavigate, useParams } from 'react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, pillClass } from '@/lib/utils';
import { LANGUAGE_OPTIONS } from '@/lib/languages';

interface LanguageSelectProps {
  className?: string;
}

/** UI language picker; the language lives in the URL, so switching navigates. */
export function LanguageSelect({ className }: LanguageSelectProps) {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();

  return (
    <Select value={lang} onValueChange={(value) => navigate(`/${value}/`)}>
      <SelectTrigger className={cn(pillClass, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom">
        {LANGUAGE_OPTIONS.map(({ code, label }) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
