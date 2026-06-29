import { useState, useMemo } from "react";
import {
  useGetDashboardSummary,
  useGetMonthlyTrend,
  useListEvaluations,
  useListSpecialists,
  getListEvaluationsQueryKey,
  type Evaluation,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, User, Printer, BarChart2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/contexts/language-context";

function ScoreBadge({ score, t }: { score: number | null; t: { excellent: string; good: string; poor: string } }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600">{t.excellent}</Badge>;
  if (score >= 70) return <Badge className="bg-orange-500 hover:bg-orange-600">{t.good}</Badge>;
  return <Badge variant="destructive">{t.poor}</Badge>;
}

interface SpecialistRow {
  specialistId: number;
  name: string;
  count: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
}

interface MonthRow {
  month: string;
  count: number;
  avgScore: number | null;
}

function computeTeamStats(evaluations: Evaluation[] | undefined): SpecialistRow[] {
  if (!evaluations) return [];
  const fin = evaluations.filter(e => e.status === "finalized");
  const map: Record<number, { name: string; scores: number[] }> = {};
  fin.forEach(ev => {
    if (!map[ev.specialistId]) map[ev.specialistId] = { name: ev.specialistName, scores: [] };
    if (ev.totalScore !== null) map[ev.specialistId].scores.push(ev.totalScore);
  });
  return Object.entries(map).map(([id, { name, scores }]) => ({
    specialistId: parseInt(id),
    name,
    count: scores.length,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    minScore: scores.length > 0 ? Math.min(...scores) : null,
    maxScore: scores.length > 0 ? Math.max(...scores) : null,
  })).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
}

function computeMonthlyStats(evaluations: Evaluation[] | undefined): MonthRow[] {
  if (!evaluations) return [];
  const fin = evaluations.filter(e => e.status === "finalized");
  const map: Record<string, number[]> = {};
  fin.forEach(ev => {
    const m = ev.date.substring(0, 7);
    if (!map[m]) map[m] = [];
    if (ev.totalScore !== null) map[m].push(ev.totalScore);
  });
  return Object.entries(map).sort().map(([month, scores]) => ({
    month,
    count: scores.length,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  }));
}

export default function Reports() {
  const { t } = useLanguage();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend();
  const { data: specialists } = useListSpecialists({ archived: false });

  // Team report state
  const [teamFrom, setTeamFrom] = useState("");
  const [teamTo, setTeamTo] = useState("");
  const [teamGenerated, setTeamGenerated] = useState(false);

  // Individual report state
  const [indivFrom, setIndivFrom] = useState("");
  const [indivTo, setIndivTo] = useState("");
  const [indivSpecialistId, setIndivSpecialistId] = useState("");
  const [indivGenerated, setIndivGenerated] = useState(false);

  // Team evaluations query
  const teamQueryParams = { dateFrom: teamFrom || undefined, dateTo: teamTo || undefined };
  const { data: teamEvals, isLoading: isLoadingTeam } = useListEvaluations(
    teamQueryParams,
    { query: { enabled: teamGenerated, queryKey: getListEvaluationsQueryKey(teamQueryParams) } }
  );

  // Individual evaluations query
  const indivSpecId = indivSpecialistId ? parseInt(indivSpecialistId) : undefined;
  const indivQueryParams = { dateFrom: indivFrom || undefined, dateTo: indivTo || undefined, specialistId: indivSpecId };
  const { data: indivEvals, isLoading: isLoadingIndiv } = useListEvaluations(
    indivQueryParams,
    { query: { enabled: indivGenerated && !!indivSpecialistId, queryKey: getListEvaluationsQueryKey(indivQueryParams) } }
  );

  const teamStats = useMemo(() => computeTeamStats(teamEvals), [teamEvals]);
  const indivMonthly = useMemo(() => computeMonthlyStats(indivEvals), [indivEvals]);

  const teamAvg = useMemo(() => {
    const scores = teamStats.filter(s => s.avgScore !== null).map(s => s.avgScore as number);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }, [teamStats]);

  const indivFinalized = useMemo(() => indivEvals?.filter(e => e.status === "finalized") ?? [], [indivEvals]);
  const indivAvg = useMemo(() => {
    const scores = indivFinalized.filter(e => e.totalScore !== null).map(e => e.totalScore as number);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }, [indivFinalized]);

  const indivSpecialist = specialists?.find(s => s.id.toString() === indivSpecialistId);
  const topPerformers = teamStats.filter(s => (s.avgScore ?? 0) >= 80);

  const handleTeamGenerate = () => setTeamGenerated(true);
  const handleIndivGenerate = () => { if (indivSpecialistId) setIndivGenerated(true); };

  const handlePrint = () => window.print();

  if (isLoadingSummary || isLoadingTrend) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!summary || !trend) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t.reports.title}</h2>
        <p className="text-muted-foreground">{t.reports.subtitle}</p>
      </div>

      {/* Report generator buttons */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Team Report */}
        <Dialog onOpenChange={() => { setTeamGenerated(false); }}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer border-2 hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t.reports.teamReport}</h3>
                  <p className="text-sm text-muted-foreground">{t.reports.teamReportDesc}</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> {t.reports.teamReportTitle}
              </DialogTitle>
            </DialogHeader>

            {/* Filter row */}
            <div className="flex flex-wrap gap-4 items-end pb-4 border-b">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.reports.from}</Label>
                <input
                  type="date"
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                  value={teamFrom}
                  onChange={e => { setTeamFrom(e.target.value); setTeamGenerated(false); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.reports.to}</Label>
                <input
                  type="date"
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                  value={teamTo}
                  onChange={e => { setTeamTo(e.target.value); setTeamGenerated(false); }}
                />
              </div>
              <Button onClick={handleTeamGenerate} className="gap-2">
                <BarChart2 className="h-4 w-4" /> {t.reports.generate}
              </Button>
              {teamGenerated && !isLoadingTeam && (
                <Button variant="outline" onClick={handlePrint} className="gap-2 print:hidden">
                  <Printer className="h-4 w-4" /> {t.reports.print}
                </Button>
              )}
            </div>

            {/* Report content */}
            {!teamGenerated ? (
              <p className="text-center text-muted-foreground py-12">{t.reports.noPeriod}</p>
            ) : isLoadingTeam ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : teamStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">{t.reports.noEvals}</p>
            ) : (
              <div className="space-y-6 print:space-y-4" id="team-report">
                {/* Header info */}
                <div className="text-xs text-muted-foreground text-right">
                  {t.reports.generatedOn}: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  {(teamFrom || teamTo) && <> • {teamFrom || "…"} → {teamTo || "…"}</>}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-primary/5">
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{t.reports.avgScore}</p>
                      <p className="text-3xl font-bold">{teamAvg !== null ? `${teamAvg}/100` : "—"}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5">
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{t.reports.evaluations}</p>
                      <p className="text-3xl font-bold">{teamStats.reduce((a, s) => a + s.count, 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5">
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{t.reports.topPerformers}</p>
                      <p className="text-3xl font-bold">{topPerformers.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top performers */}
                {topPerformers.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-green-700">{t.reports.topPerformers}</h4>
                    <div className="flex flex-wrap gap-2">
                      {topPerformers.map(s => (
                        <div key={s.specialistId} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                          <span className="font-medium text-sm">{s.name}</span>
                          <Badge className="bg-green-500 hover:bg-green-600 text-xs">{s.avgScore}/100</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All specialists table */}
                <div>
                  <h4 className="font-semibold mb-3">{t.reports.allSpecialists}</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left">{t.reports.rank}</th>
                          <th className="px-4 py-2 text-left">{t.reports.specialist}</th>
                          <th className="px-4 py-2 text-center">{t.reports.evaluations}</th>
                          <th className="px-4 py-2 text-center">{t.reports.score}</th>
                          <th className="px-4 py-2 text-center">{t.reports.scoreMin}</th>
                          <th className="px-4 py-2 text-center">{t.reports.scoreMax}</th>
                          <th className="px-4 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamStats.map((s, i) => (
                          <tr key={s.specialistId} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-3 font-bold text-muted-foreground">#{i + 1}</td>
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-center">{s.count}</td>
                            <td className="px-4 py-3 text-center font-bold">
                              {s.avgScore !== null ? `${s.avgScore}/100` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{s.minScore ?? "—"}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{s.maxScore ?? "—"}</td>
                            <td className="px-4 py-3 text-center">
                              <ScoreBadge score={s.avgScore} t={{ excellent: t.reports.excellent, good: t.reports.good, poor: t.reports.poor }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Score chart */}
                <div>
                  <h4 className="font-semibold mb-3">{t.reports.avgScore}</h4>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamStats} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="avgScore" name={t.reports.score} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Individual Report */}
        <Dialog onOpenChange={() => { setIndivGenerated(false); }}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer border-2 hover:border-primary/50 hover:bg-primary/5 transition-all group">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t.reports.individualReport}</h3>
                  <p className="text-sm text-muted-foreground">{t.reports.individualReportDesc}</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> {t.reports.individualReportTitle}
              </DialogTitle>
            </DialogHeader>

            {/* Filter row */}
            <div className="flex flex-wrap gap-4 items-end pb-4 border-b">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.reports.from}</Label>
                <input
                  type="date"
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                  value={indivFrom}
                  onChange={e => { setIndivFrom(e.target.value); setIndivGenerated(false); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t.reports.to}</Label>
                <input
                  type="date"
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                  value={indivTo}
                  onChange={e => { setIndivTo(e.target.value); setIndivGenerated(false); }}
                />
              </div>
              <div className="space-y-1.5 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">{t.reports.specialist}</Label>
                <Select value={indivSpecialistId} onValueChange={v => { setIndivSpecialistId(v); setIndivGenerated(false); }}>
                  <SelectTrigger><SelectValue placeholder={t.reports.selectSpecialist} /></SelectTrigger>
                  <SelectContent>
                    {specialists?.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleIndivGenerate} disabled={!indivSpecialistId} className="gap-2">
                <BarChart2 className="h-4 w-4" /> {t.reports.generate}
              </Button>
              {indivGenerated && !isLoadingIndiv && (
                <Button variant="outline" onClick={handlePrint} className="gap-2 print:hidden">
                  <Printer className="h-4 w-4" /> {t.reports.print}
                </Button>
              )}
            </div>

            {/* Report content */}
            {!indivGenerated ? (
              <p className="text-center text-muted-foreground py-12">{t.reports.noPeriod}</p>
            ) : isLoadingIndiv ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : indivFinalized.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">{t.reports.noEvals}</p>
            ) : (
              <div className="space-y-6 print:space-y-4" id="indiv-report">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{indivSpecialist?.firstName} {indivSpecialist?.lastName}</h3>
                    <p className="text-sm text-muted-foreground">{indivSpecialist?.position} • {indivSpecialist?.department}</p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {t.reports.generatedOn}: {new Date().toLocaleDateString()}
                    {(indivFrom || indivTo) && <><br />{indivFrom || "…"} → {indivTo || "…"}</>}
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-primary/5">
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{t.reports.avgScore}</p>
                      <p className="text-3xl font-bold text-primary">{indivAvg !== null ? `${indivAvg}/100` : "—"}</p>
                      <ScoreBadge score={indivAvg} t={{ excellent: t.reports.excellent, good: t.reports.good, poor: t.reports.poor }} />
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5">
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{t.reports.evaluations}</p>
                      <p className="text-3xl font-bold">{indivFinalized.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5">
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-xs text-muted-foreground uppercase">{t.reports.scoreMin} / {t.reports.scoreMax}</p>
                      <p className="text-xl font-bold">
                        {Math.min(...indivFinalized.filter(e => e.totalScore !== null).map(e => e.totalScore as number))}
                        {" / "}
                        {Math.max(...indivFinalized.filter(e => e.totalScore !== null).map(e => e.totalScore as number))}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly breakdown chart */}
                {indivMonthly.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">{t.reports.monthlyBreakdown}</h4>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={indivMonthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="avgScore" name={t.reports.avgScore} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Monthly table */}
                <div>
                  <h4 className="font-semibold mb-3">{t.reports.monthlyBreakdown}</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left">{t.reports.month}</th>
                          <th className="px-4 py-2 text-center">{t.reports.count}</th>
                          <th className="px-4 py-2 text-center">{t.reports.score}</th>
                          <th className="px-4 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {indivMonthly.map(row => (
                          <tr key={row.month} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{row.month}</td>
                            <td className="px-4 py-3 text-center">{row.count}</td>
                            <td className="px-4 py-3 text-center font-bold">
                              {row.avgScore !== null ? `${row.avgScore}/100` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ScoreBadge score={row.avgScore} t={{ excellent: t.reports.excellent, good: t.reports.good, poor: t.reports.poor }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* All evaluations list */}
                <div>
                  <h4 className="font-semibold mb-3">{t.reports.evaluationsList}</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left">{t.reports.date}</th>
                          <th className="px-4 py-2 text-left">{t.reports.client}</th>
                          <th className="px-4 py-2 text-center">{t.reports.type}</th>
                          <th className="px-4 py-2 text-center">{t.reports.totalScore}</th>
                          <th className="px-4 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {indivFinalized.map(ev => (
                          <tr key={ev.id} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-3">{new Date(ev.date).toLocaleDateString()} {ev.time}</td>
                            <td className="px-4 py-3 truncate max-w-[180px]">{ev.clientName}</td>
                            <td className="px-4 py-3 text-center capitalize">{ev.evaluationType}</td>
                            <td className="px-4 py-3 text-center font-bold">
                              {ev.totalScore !== null ? `${ev.totalScore}/100` : "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ScoreBadge score={ev.totalScore} t={{ excellent: t.reports.excellent, good: t.reports.good, poor: t.reports.poor }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.trendTitle}</CardTitle>
            <CardDescription>{t.reports.trendDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="averageScore" name={t.reports.avgScore} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reports.volumeTitle}</CardTitle>
            <CardDescription>{t.reports.volumeDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name={t.reports.evalCount} fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.sectionsTitle}</CardTitle>
          <CardDescription>{t.reports.sectionsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.sectionScores} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="sectionName" axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="averageScore" name={t.reports.scoreLabel} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
