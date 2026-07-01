import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTennisNews } from "@/lib/services/news";
import { Newspaper, ExternalLink } from "lucide-react";

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export async function NewsSection() {
  let news;
  let error: string | null = null;
  try {
    news = await getTennisNews();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load news.";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="size-5" /> Tennis News
          </CardTitle>
          <CardDescription dir="rtl" lang="fa" className="mt-1">
            این اخبار تنیس هر روز آپدیت میشه و پنج خبر مهم تنیس دیروز رو نشون میده
          </CardDescription>
        </div>
        {news && (
          <span className="shrink-0 text-xs text-muted-foreground">
            Updated {timeAgo(news.fetchedAt)}
            {news.stale && " (cached)"}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-muted-foreground">
            News is unavailable right now.{" "}
            <span className="text-xs">({error})</span>
          </p>
        )}
        {news && news.articles.length === 0 && (
          <p className="text-sm text-muted-foreground">No news found.</p>
        )}
        {news?.articles.map((article, i) => (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{article.title}</p>
              <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{article.summary}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{article.source}</Badge>
              <span className="text-[10px] text-muted-foreground">{article.published}</span>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export function NewsSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="size-5" /> Tennis News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
