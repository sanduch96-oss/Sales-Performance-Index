import {
  useGetDashboardSummary,
  useGetLowPerformers,
  useListEvaluations,
  useGetMonthlyTrend,
  useGetRecentEvaluations,
  useGetMe,
  useGetSpecialistStats,
  useGetSpecialist,
  getGetSpecialistStatsQueryKey,
  getGetSpecialistQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, TrendingUp, TrendingDown, Minus, Loader2, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { LocalizedDatePicker } from "@/components/ui/localized-date-picker";
import { customFetch } from "@workspace/api-client-react";

function SpecialistDashboard({ specialistId }: { specialistId: number }) {
  const { t } = useLanguage();

  const { data: specialist, isLoading: isLoadingSpec } = useGetSpecialist(specialistId, {
    query: { enabled: !!specialistId, queryKey: getGetSpecialistQueryKey(specialistId) },
  });
  const { data: stats, isLoading: isLoadingStats } = useGetSpecialistStats(specialistId, {
    query: { enabled: !!specialistId, queryKey: getGetSpecialistStatsQueryKey(specialistId) },
  });
  const { data: evaluations, isLoading: isLoadingEvals } = useListEvaluations({ specialistId });

  function getScoreBadge(score: number | null) {
    if (score === null) return null;
    if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600">{t.profile.excellent}</Badge>;
    if (score >= 70) return <Badge className="bg-orange-500 hover:bg-orange-600">{t.profile.good}</Badge>;
    return <Badge variant="destructive">{t.profile.poor}</Badge>;
  }

  if (isLoadingSpec || isLoadingStats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {specialist ? `${specialist.firstName} ${specialist.lastName}` : t.dashboard.title}
        </h2>
        <p className="text-muted-foreground">
          {specialist?.position} {specialist?.department ? `• ${specialist.department}` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t.profile.spiScore}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {specialist?.spiScore != null ? `${specialist.spiScore}/100` : t.common.na}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t.profile.avgScore}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageScore != null ? `${stats.averageScore}/100` : t.common.na}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t.profile.evalCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.evaluationCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t.profile.evolution}</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            {stats?.monthlyTrend && stats.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={t.profile.score} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t.profile.noData}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t.profile.skills}</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            {stats?.radarData && stats.radarData.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name={t.profile.score} dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center px-4">{t.profile.radarMin}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.profile.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEvals ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !evaluations?.length ? (
            <p className="text-center text-muted-foreground py-8">{t.profile.noEvals}</p>
          ) : (
            <div className="space-y-2">
              {evaluations.filter(ev => ev.status === "finalized").map(ev => (
                <Link key={ev.id} href={`/evaluations/${ev.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mr-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t.profile.date}</p>
                        <p className="font-medium">{new Date(ev.date).toLocaleDateString()} {ev.time}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.profile.client}</p>
                        <p className="font-medium truncate">{ev.clientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.profile.type}</p>
                        <p className="font-medium capitalize">{ev.evaluationType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 whitespace-nowrap">
                      {getScoreBadge(ev.totalScore)}
                      <span className="font-bold w-16 text-right">{ev.totalScore !== null ? `${ev.totalScore}/100` : "-"}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: user } = useGetMe();

  if (user?.role === "user" && user.specialistId) {
    return <SpecialistDashboard specialistId={user.specialistId} />;
  }

  if (user?.role?.toLowerCase() === "evaluator") {
    return <EvaluatorDashboard />;
  }

  return <AdminDashboard />;
}

function EvaluatorDashboard() {
  const { t } = useLanguage();
  const { data: user } = useGetMe();
  const { data: progress, isLoading } = useQuery<{ target: number; done: number; total: number; month: string }>({
    queryKey: ["evaluator-progress"],
    queryFn: () => customFetch("/api/dashboard/evaluator-progress"),
  });
  const { data: recent = [], isLoading: isLoadingRecent } = useQuery<any[]>({
    queryKey: ["my-evaluations"],
    queryFn: () => customFetch("/api/evaluations?myEvaluations=true"),
    enabled: !!user,
  });

  const percent = progress && progress.target > 0
    ? Math.min(Math.round((progress.done / progress.target) * 100), 100)
    : 0;

  const monthName = progress?.month
    ? new Date(progress.month + "-01").toLocaleDateString("ro-RO", { month: "long", year: "numeric" })
    : "";

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h2>
        <p className="text-muted-foreground">{monthName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Progres lunar */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progres evaluări — {monthName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {progress && progress.target > 0 ? (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-bold text-primary">{progress.done}</span>
                  <span className="text-muted-foreground text-lg">/ {progress.target} planificate</span>
                </div>
                <Progress value={percent} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {percent}% finalizat{progress.done >= progress.target ? " ✓" : ` — mai rămân ${progress.target - progress.done}`}
                </p>
              </>
            ) : (
              <div className="py-4 text-muted-foreground text-sm">
                Nicio sarcină de evaluare alocată pentru această lună.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total toate timpurile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalEvals}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{progress?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">evaluări efectuate total</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluări recente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluările mele recente</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !recent?.length ? (
            <p className="text-center text-muted-foreground py-8">Nicio evaluare efectuată încă.</p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 10).map(ev => (
                <Link key={ev.id} href={`/evaluari/${ev.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ev.clientName}</p>
                      <p className="text-sm text-muted-foreground">{ev.date}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {ev.totalScore != null && (
                        <span className="font-bold">{ev.totalScore}/100</span>
                      )}
                      <Badge variant={ev.status === "finalized" ? "default" : "secondary"}>
                        {ev.status === "finalized" ? "Finalizat" : "Ciornă"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const { t } = useLanguage();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend();
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentEvaluations({ limit: 5 });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const toYearMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const [trendFrom, setTrendFrom] = useState(toYearMonth(sixMonthsAgo));
  const [trendTo, setTrendTo] = useState(toYearMonth(now));

  const { data: allEvaluations, isLoading: isLoadingAllEvals } = useListEvaluations({ dateFrom, dateTo });
  const { data: lowPerformers, isLoading: isLoadingLowPerformers } = useGetLowPerformers();

  function getScoreBadge(score: number | null) {
    if (score === null) return null;
    if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600">{t.dashboard.score} ✓</Badge>;
    if (score >= 70) return <Badge className="bg-orange-500 hover:bg-orange-600">{t.evaluations.good}</Badge>;
    return <Badge variant="destructive">{t.evaluations.poor}</Badge>;
  }

  if (isLoadingSummary || isLoadingTrend || isLoadingRecent) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary) return null;

  const scoreChange = summary.averageScoreLastMonth
    ? (summary.averageTeamScore ?? 0) - summary.averageScoreLastMonth
    : 0;

  const monthlyTarget = (summary as any).totalMonthlyTarget ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h2>
        <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.avgScore}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageTeamScore !== null ? `${summary.averageTeamScore}/100` : t.common.na}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {scoreChange > 0 ? (
                <><TrendingUp className="mr-1 h-3 w-3 text-green-500" /> <span className="text-green-500">+{scoreChange.toFixed(1)}</span></>
              ) : scoreChange < 0 ? (
                <><TrendingDown className="mr-1 h-3 w-3 text-red-500" /> <span className="text-red-500">{scoreChange.toFixed(1)}</span></>
              ) : (
                <><Minus className="mr-1 h-3 w-3" /> {t.dashboard.noChanges}</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalEvals}</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.dashboard.allEvals}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">{t.dashboard.from}</Label>
                      <LocalizedDatePicker value={dateFrom} onChange={setDateFrom} className="w-full" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">{t.dashboard.to}</Label>
                      <LocalizedDatePicker value={dateTo} onChange={setDateTo} className="w-full" />
                    </div>
                  </div>
                  {isLoadingAllEvals ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : (
                    <div className="space-y-2">
                      {allEvaluations?.map(evalItem => (
                        <div key={evalItem.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{evalItem.specialistName}</p>
                            <p className="text-xs text-muted-foreground">{new Date(evalItem.date).toLocaleDateString()} • {evalItem.evaluationType}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold">{evalItem.totalScore}/100</span>
                            {getScoreBadge(evalItem.totalScore)}
                          </div>
                        </div>
                      ))}
                      {!allEvaluations?.length && (
                        <p className="text-center text-muted-foreground py-4">{t.dashboard.noEvalsInterval}</p>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEvaluations}</div>
            {monthlyTarget > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t.dashboard.monthlyProgress}</span>
                  <span>{summary.evaluationsThisMonth} / {monthlyTarget}</span>
                </div>
                <Progress
                  value={Math.min((summary.evaluationsThisMonth / monthlyTarget) * 100, 100)}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {t.dashboard.target}: {monthlyTarget} {t.dashboard.evalsPerMonth}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.weakestSection}</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.dashboard.sectionPerformance}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  {summary.sectionScores?.map((sp) => (
                    <div key={sp.sectionId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate max-w-[200px]">{sp.sectionName}</span>
                        <span className="font-medium">{(sp.averageScore ?? 0).toFixed(1)}%</span>
                      </div>
                      <Progress value={sp.averageScore ?? 0} className="h-1.5" />
                    </div>
                  ))}
                  {(!summary.sectionScores || summary.sectionScores.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">{t.dashboard.noData}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {summary.worstSection ?? <span className="text-muted-foreground text-sm font-normal">{t.dashboard.noData}</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.bestSection}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {summary.bestSection ?? <span className="text-muted-foreground text-sm font-normal">{t.dashboard.noData}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.monthlyTrend}</CardTitle>
            <div className="flex gap-3 mt-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{t.dashboard.trendFrom}</Label>
                <Input type="month" value={trendFrom} onChange={e => setTrendFrom(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{t.dashboard.trendTo}</Label>
                <Input type="month" value={trendTo} onChange={e => setTrendTo(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTrend ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : !trend?.length ? (
              <p className="text-center text-muted-foreground py-8">{t.dashboard.noData}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}/100`, t.dashboard.avgScore]} />
                  <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentEvals}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t.dashboard.recentDesc} 5 {t.dashboard.recentDesc2}
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : !recent?.length ? (
              <p className="text-center text-muted-foreground py-8">{t.dashboard.noRecent}</p>
            ) : (
              <div className="space-y-3">
                {recent.map(evalItem => (
                  <Link key={evalItem.id} href={`/evaluations/${evalItem.id}`}>
                    <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{evalItem.specialistName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(evalItem.date).toLocaleDateString()} • {evalItem.evaluationType}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{evalItem.totalScore}/100</span>
                        {getScoreBadge(evalItem.totalScore)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.lowPerformers}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLowPerformers ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !lowPerformers?.length ? (
            <p className="text-center text-muted-foreground py-4">{t.dashboard.noLowPerformers}</p>
          ) : (
            <div className="divide-y divide-border">
              {lowPerformers.map(sp => (
                <Link key={sp.id} href={`/specialists/${sp.id}`}>
                  <div className="flex justify-between items-center py-3 hover:bg-muted/30 transition-colors cursor-pointer px-2 rounded-lg">
                    <div>
                      <p className="font-medium">{sp.firstName} {sp.lastName}</p>
                    </div>
                    <Badge variant="destructive">{(sp.spiScore ?? 0).toFixed(1)}/100</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
