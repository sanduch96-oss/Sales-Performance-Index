import { useParams, Link } from "wouter";
import { useState } from "react";
import { 
  useGetSpecialist, 
  useGetSpecialistStats, 
  useListEvaluations,
  useUpdateSpecialist,
  getGetSpecialistQueryKey,
  getGetSpecialistStatsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ChevronRight, ClipboardList, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useLanguage } from "@/contexts/language-context";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SpecialistProfile() {
  const { id } = useParams();
  const specialistId = parseInt(id || "0");
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: specialist, isLoading: isLoadingSpec } = useGetSpecialist(specialistId, { query: { enabled: !!specialistId, queryKey: getGetSpecialistQueryKey(specialistId) } });
  const { data: stats, isLoading: isLoadingStats } = useGetSpecialistStats(specialistId, { query: { enabled: !!specialistId, queryKey: getGetSpecialistStatsQueryKey(specialistId) } });
  const { data: evaluations, isLoading: isLoadingEvals } = useListEvaluations({ specialistId });
  const updateSpecialist = useUpdateSpecialist();

  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [targetValue, setTargetValue] = useState("");

  function getScoreBadge(score: number | null) {
    if (score === null) return null;
    if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600">{t.profile.excellent}</Badge>;
    if (score >= 70) return <Badge className="bg-orange-500 hover:bg-orange-600">{t.profile.good}</Badge>;
    return <Badge variant="destructive">{t.profile.poor}</Badge>;
  }

  if (isLoadingSpec || isLoadingStats) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!specialist || !stats) {
    return <div>Specialist not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/specialists">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{specialist.firstName} {specialist.lastName}</h2>
          <p className="text-muted-foreground">{specialist.position} • {specialist.department}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setTargetValue(specialist.monthlyTarget != null ? String(specialist.monthlyTarget) : "");
              setIsTargetDialogOpen(true);
            }}
          >
            <Target className="mr-2 h-4 w-4" />
            {t.specialists.monthlyTarget}{specialist.monthlyTarget != null ? `: ${specialist.monthlyTarget}` : ""}
          </Button>
          <Link href={`/evaluations/new?specialistId=${specialistId}`}>
            <Button>
              <ClipboardList className="mr-2 h-4 w-4" /> {t.profile.evaluate}
            </Button>
          </Link>
          <div className="text-right">
            <p className="text-sm text-muted-foreground uppercase font-semibold">{t.profile.spiScore}</p>
            <p className="text-4xl font-bold text-primary">{specialist.spiScore !== null ? `${specialist.spiScore}/100` : t.common.na}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.profile.avgScore}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore !== null ? `${stats.averageScore}/100` : t.common.na}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.profile.evalCount}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.evaluationCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.profile.bestSection}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{stats.bestSection || t.common.na}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.profile.worstSection}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{stats.worstSection || t.common.na}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t.profile.evolution}</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {stats.monthlyTrend && stats.monthlyTrend.length > 0 ? (
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
          <CardContent className="h-[300px]">
            {stats.radarData && stats.radarData.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
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
          <CardDescription>{t.profile.historyDesc} {specialist.firstName}.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEvals ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : evaluations?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.profile.noEvals}</p>
          ) : (
            <div className="space-y-2">
              {evaluations?.map(ev => (
                <Link key={ev.id} href={`/evaluations/${ev.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mr-4">
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
                      <div>
                        <p className="text-sm text-muted-foreground">{t.profile.status}</p>
                        <Badge variant={ev.status === "finalized" ? "default" : "secondary"}>
                          {ev.status === "finalized" ? t.profile.finalized : t.profile.draft}
                        </Badge>
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
      <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dashboard.setTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>{t.specialists.monthlyTarget}</Label>
            <Input
              type="number"
              min={0}
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              placeholder="ex: 20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTargetDialogOpen(false)}>{t.newEval.cancel}</Button>
            <Button
              disabled={updateSpecialist.isPending}
              onClick={async () => {
                const val = targetValue === "" ? null : parseInt(targetValue);
                try {
                  await updateSpecialist.mutateAsync({
                    id: specialistId,
                    data: { monthlyTarget: val } as any,
                  });
                  await queryClient.invalidateQueries({ queryKey: getGetSpecialistQueryKey(specialistId) });
                  toast({ title: t.common.save });
                  setIsTargetDialogOpen(false);
                } catch {
                  toast({ variant: "destructive", title: t.newEval.saveError });
                }
              }}
            >
              {updateSpecialist.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
