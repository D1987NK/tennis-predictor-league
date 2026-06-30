import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/tour-badge";
import { Trophy, Target, BarChart3, Zap } from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const features = [
    { icon: Target, title: "Predict winners & scores", desc: "Call the winner and the exact set score for every ATP & WTA match." },
    { icon: Zap, title: "Auto-scored daily", desc: "Results import and your points are calculated automatically." },
    { icon: BarChart3, title: "Climb the leaderboard", desc: "Track accuracy, correct sets and your rank across the season." },
    { icon: Trophy, title: "Compete to win", desc: "Up to 80 points per match. Top the table and claim gold." },
  ];

  return (
    <main className="court-gradient min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Logo className="text-xl" />
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="container flex flex-col items-center py-20 text-center md:py-28">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          🎾 ATP & WTA · Grand Slams · Live leaderboard
        </span>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
          Predict the matches.{" "}
          <span className="text-primary">Top the league.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Forecast ATP and WTA results, earn points for correct winners, scores and
          set-by-set predictions, and battle friends for the top spot.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">I already have one</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
            <f.icon className="mb-3 size-6 text-primary" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
