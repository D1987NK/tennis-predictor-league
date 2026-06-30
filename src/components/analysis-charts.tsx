"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnalysisData {
  totalPredictions: number;
  daily: { date: string; points: number; cumulative: number; correct: number; wrong: number }[];
  winnerAccuracy: { name: string; value: number }[];
  pointsSource: { name: string; value: number }[];
  byTour: { tour: string; points: number; accuracy: number; predicted: number }[];
  radar: { metric: string; value: number }[];
  byTournament: { tournament: string; points: number }[];
  vsLeague: { name: string; points: number }[];
  byFormat: { format: string; accuracy: number; points: number; predicted: number }[];
}

const C = {
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  amber: "#f59e0b",
  red: "#ef4444",
  slate: "#94a3b8",
  teal: "#14b8a6",
};

const axisTick = { fill: "#94a3b8", fontSize: 11 };
const gridStroke = "rgba(148,163,184,0.15)";
const tooltipStyle = {
  backgroundColor: "hsl(222 40% 11%)",
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

function ChartCard({
  title,
  description,
  hasData,
  children,
}: {
  title: string;
  description?: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalysisCharts({ data }: { data: AnalysisData }) {
  const sourceColors = [C.green, C.blue, C.purple];
  const accColors = [C.green, C.red];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 1. Cumulative points over time */}
      <ChartCard
        title="Points over time"
        description="Your cumulative points as results come in"
        hasData={data.daily.length > 0}
      >
        <AreaChart data={data.daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gPoints" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.green} stopOpacity={0.5} />
              <stop offset="100%" stopColor={C.green} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridStroke} />
          <XAxis dataKey="date" tick={axisTick} />
          <YAxis tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="cumulative" name="Total points" stroke={C.green} fill="url(#gPoints)" strokeWidth={2} />
        </AreaChart>
      </ChartCard>

      {/* 2. Points per day */}
      <ChartCard title="Points per day" description="How many points you earned each day" hasData={data.daily.length > 0}>
        <BarChart data={data.daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="date" tick={axisTick} />
          <YAxis tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="points" name="Points" fill={C.green} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      {/* 3. Winner accuracy */}
      <ChartCard title="Winner accuracy" description="Correct vs missed match winners" hasData={data.winnerAccuracy.length > 0}>
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Pie data={data.winnerAccuracy} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.winnerAccuracy.map((_, i) => (
              <Cell key={i} fill={accColors[i % accColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartCard>

      {/* 4. Points by source */}
      <ChartCard title="Where your points come from" description="Winners vs match scores vs set scores" hasData={data.pointsSource.some((s) => s.value > 0)}>
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Pie data={data.pointsSource} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.pointsSource.map((_, i) => (
              <Cell key={i} fill={sourceColors[i % sourceColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartCard>

      {/* 5. ATP vs WTA */}
      <ChartCard title="ATP vs WTA" description="Points and winner accuracy by tour" hasData={data.byTour.some((t) => t.predicted > 0)}>
        <ComposedChart data={data.byTour} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="tour" tick={axisTick} />
          <YAxis yAxisId="left" tick={axisTick} />
          <YAxis yAxisId="right" orientation="right" tick={axisTick} unit="%" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Legend />
          <Bar yAxisId="left" dataKey="points" name="Points" fill={C.blue} radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" name="Accuracy %" stroke={C.amber} strokeWidth={2} />
        </ComposedChart>
      </ChartCard>

      {/* 6. Skill radar */}
      <ChartCard title="Skill profile" description="Your accuracy across prediction types (%)" hasData={data.radar.some((r) => r.value > 0)}>
        <RadarChart data={data.radar} outerRadius={90}>
          <PolarGrid stroke={gridStroke} />
          <PolarAngleAxis dataKey="metric" tick={axisTick} />
          <PolarRadiusAxis domain={[0, 100]} tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Radar dataKey="value" name="You" stroke={C.purple} fill={C.purple} fillOpacity={0.4} />
        </RadarChart>
      </ChartCard>

      {/* 7. Points by tournament */}
      <ChartCard title="Points by tournament" description="Your best events" hasData={data.byTournament.length > 0}>
        <BarChart data={data.byTournament} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={axisTick} />
          <YAxis type="category" dataKey="tournament" tick={axisTick} width={90} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="points" name="Points" fill={C.teal} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>

      {/* 8. Correct vs wrong winners per day */}
      <ChartCard title="Correct vs missed winners" description="Daily winner predictions" hasData={data.daily.length > 0}>
        <BarChart data={data.daily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="date" tick={axisTick} />
          <YAxis tick={axisTick} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Legend />
          <Bar dataKey="correct" name="Correct" stackId="a" fill={C.green} radius={[4, 4, 0, 0]} />
          <Bar dataKey="wrong" name="Missed" stackId="a" fill={C.red} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      {/* 9. You vs league average */}
      <ChartCard title="You vs league average" description="Your points compared to the field" hasData={data.vsLeague.length > 0}>
        <BarChart data={data.vsLeague} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" tick={axisTick} />
          <YAxis tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="points" name="Points" radius={[4, 4, 0, 0]}>
            <Cell fill={C.green} />
            <Cell fill={C.slate} />
            <LabelList dataKey="points" position="top" fill="#94a3b8" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartCard>

      {/* 10. Best-of-3 vs best-of-5 */}
      <ChartCard title="Best-of-3 vs best-of-5" description="Winner accuracy by match format" hasData={data.byFormat.some((f) => f.predicted > 0)}>
        <BarChart data={data.byFormat} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="format" tick={axisTick} />
          <YAxis tick={axisTick} unit="%" domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="accuracy" name="Accuracy %" fill={C.amber} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="predicted" position="top" formatter={(v: number) => `${v} pred`} fill="#94a3b8" fontSize={10} />
          </Bar>
        </BarChart>
      </ChartCard>
    </div>
  );
}
