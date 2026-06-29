import { useGetDashboardSummary, useGetLowPerformers, useListEvaluations, useGetMonthlyTrend, useGetRecentEvaluations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Link } from "wouter";

function getScoreBadge(score: number | null) {
  if (score === null) return null;
  if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600">Excelent</Badge>;
  if (score >= 70) return <Badge className="bg-orange-500 hover:bg-orange-600">Bun</Badge>;
  return <Badge variant="destructive">Slab</Badge>;
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: trend, isLoading: isLoadingTrend } = useGetMonthlyTrend();
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentEvaluations({ limit: 5 });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: allEvaluations, isLoading: isLoadingAllEvals } = useListEvaluations({ dateFrom, dateTo });
  const { data: lowPerformers, isLoading: isLoadingLowPerformers } = useGetLowPerformers();

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

  const evalsGrowth = summary.evaluationsLastMonth > 0
    ? Math.round(((summary.evaluationsThisMonth - summary.evaluationsLastMonth) / summary.evaluationsLastMonth) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Privire de ansamblu asupra performanței echipei.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scor mediu echipă</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageTeamScore !== null ? `${summary.averageTeamScore}/100` : "N/A"}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {scoreChange > 0 ? (
                <><TrendingUp className="mr-1 h-3 w-3 text-green-500" /> <span className="text-green-500">+{scoreChange.toFixed(1)} față de luna trecută</span></>
              ) : scoreChange < 0 ? (
                <><TrendingDown className="mr-1 h-3 w-3 text-red-500" /> <span className="text-red-500">{scoreChange.toFixed(1)} față de luna trecută</span></>
              ) : (
                <><Minus className="mr-1 h-3 w-3" /> Fără schimbări</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total evaluări</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Toate evaluările</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input type="date" className="flex-1 px-3 py-2 border rounded-md" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <input type="date" className="flex-1 px-3 py-2 border rounded-md" value={dateTo} onChange={e => setDateTo(e.target.value)} />
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
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEvaluations}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {evalsGrowth > 0 ? (
                 <><TrendingUp className="mr-1 h-3 w-3 text-green-500" /> <span className="text-green-500">+{evalsGrowth}% luna aceasta</span></>
              ) : evalsGrowth < 0 ? (
                 <><TrendingDown className="mr-1 h-3 w-3 text-red-500" /> <span className="text-red-500">{evalsGrowth}% luna aceasta</span></>
              ) : (
                <><Minus className="mr-1 h-3 w-3" /> Fără schimbări</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Etapa cea mai slabă</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Specialiști cu scor mediu &lt; 70</DialogTitle>
                </DialogHeader>
                {isLoadingLowPerformers ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {lowPerformers?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Nu există specialiști sub performanță.</p>
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
            <div className="text-xl font-bold truncate">{summary.worstSection || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.worstSectionScore !== null && summary.worstSectionScore !== undefined ? `${summary.worstSectionScore}% mediu` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Etapa cea mai bună</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{summary.bestSection || "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.bestSectionScore !== null && summary.bestSectionScore !== undefined ? `${summary.bestSectionScore}% mediu` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performanța pe compartimente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.sectionScores.map(section => (
                <div key={section.sectionId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{section.sectionName}</span>
                    <span className="font-medium">{section.averageScore !== null ? `${section.averageScore}%` : "N/A"}</span>
                  </div>
                  <Progress value={section.averageScore || 0} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evoluție lunară</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {trend && trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="averageScore" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Scor Mediu" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Nu există date suficiente.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Evaluări recente</CardTitle>
              <CardDescription>Ultimele {recent?.length || 0} evaluări adăugate.</CardDescription>
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
                    <span className="text-muted-foreground">Scor:</span>
                    <span className="font-bold">{evalItem.totalScore !== null ? `${evalItem.totalScore}/100` : "În progres"}</span>
                  </div>
                </div>
              ))}
              {!recent?.length && (
                <div className="text-center text-muted-foreground py-8">Nu există evaluări recente.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
