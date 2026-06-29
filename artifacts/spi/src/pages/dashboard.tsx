import { useGetDashboardSummary, useGetLowPerformers, useListEvaluations, useGetMonthlyTrend, useGetRecentEvaluations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, TrendingUp, TrendingDown, Minus, Loader2, Pencil, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";
import { LocalizedDatePicker } from "@/components/ui/localized-date-picker";

const MONTHLY_TARGET_KEY = "spi_monthly_eval_target";

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend();
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentEvaluations({ limit: 5 });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem(MONTHLY_TARGET_KEY);
    return saved ? parseInt(saved) : 20;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

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
            <div className="flex items-center gap-1">
              {isEditingTarget ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    className="h-6 w-16 text-xs px-2"
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const val = parseInt(targetInput);
                        if (val > 0) {
                          setMonthlyTarget(val);
                          localStorage.setItem(MONTHLY_TARGET_KEY, String(val));
                        }
                        setIsEditingTarget(false);
                      }
                      if (e.key === "Escape") setIsEditingTarget(false);
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const val = parseInt(targetInput);
                      if (val > 0) {
                        setMonthlyTarget(val);
                        localStorage.setItem(MONTHLY_TARGET_KEY, String(val));
                      }
                      setIsEditingTarget(false);
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={t.dashboard.editTarget}
                  onClick={() => {
                    setTargetInput(String(monthlyTarget));
                    setIsEditingTarget(true);
                  }}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEvaluations}</div>
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
                  <DialogTitle>{t.dashboard.lowPerformers}</DialogTitle>
                </DialogHeader>
                {isLoadingLowPerformers ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {lowPerformers?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">{t.dashboard.noLowPerformers}</p>
                    ) : lowPerformers?.map(specialist => (
                      <div key={specialist.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{specialist.firstName} {specialist.lastName}</p>
                          <p className="text-xs text-muted-foreground">{specialist.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-500">{specialist.spiScore}/100</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{summary.worstSection || t.common.na}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.worstSectionScore !== null && summary.worstSectionScore !== undefined ? `${summary.worstSectionScore}% ${t.evalDetail.average}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.bestSection}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{summary.bestSection || t.common.na}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.bestSectionScore !== null && summary.bestSectionScore !== undefined ? `${summary.bestSectionScore}% ${t.evalDetail.average}` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.sectionPerformance}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.sectionScores.map(section => (
                <div key={section.sectionId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{section.sectionName}</span>
                    <span className="font-medium">{section.averageScore !== null ? `${section.averageScore}%` : t.common.na}</span>
                  </div>
                  <Progress value={section.averageScore || 0} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle>{t.dashboard.monthlyTrend}</CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">{t.dashboard.trendFrom}</Label>
                    <input
                      type="month"
                      className="px-2 py-1 border rounded-md text-sm bg-background"
                      value={trendFrom}
                      onChange={e => setTrendFrom(e.target.value)}
                    />
                  </div>
                  <span className="text-muted-foreground mt-4">—</span>
                  <div className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">{t.dashboard.trendTo}</Label>
                    <input
                      type="month"
                      className="px-2 py-1 border rounded-md text-sm bg-background"
                      value={trendTo}
                      onChange={e => setTrendTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              {(() => {
                const filtered = (trend ?? []).filter(p => {
                  if (trendFrom && p.month < trendFrom) return false;
                  if (trendTo && p.month > trendTo) return false;
                  return true;
                });
                return filtered.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filtered} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={t.reports.avgScore} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t.dashboard.noDataInterval}</div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t.dashboard.recentEvals}</CardTitle>
              <CardDescription>{t.dashboard.recentDesc} {recent?.length || 0} {t.dashboard.recentDesc2}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recent?.map(evalItem => (
                <div key={evalItem.id} className="flex flex-col gap-2 p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/evaluations/${evalItem.id}`}>
                        <p className="font-semibold hover:text-primary cursor-pointer transition-colors">{evalItem.specialistName}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{evalItem.evaluationType} • {new Date(evalItem.date).toLocaleDateString()}</p>
                    </div>
                    {getScoreBadge(evalItem.totalScore)}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t text-sm">
                    <span className="text-muted-foreground">{t.dashboard.score}:</span>
                    <span className="font-bold">{evalItem.totalScore !== null ? `${evalItem.totalScore}/100` : "-"}</span>
                  </div>
                </div>
              ))}
              {!recent?.length && (
                <div className="text-center text-muted-foreground py-8">{t.dashboard.noRecent}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
