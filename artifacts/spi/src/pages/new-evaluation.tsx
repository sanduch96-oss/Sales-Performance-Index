import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { 
  useListSpecialists, 
  useListCriteriaSections, 
  useCreateEvaluation,
  useUpdateEvaluation,
  useFinalizeEvaluation,
  useAttachEvaluationAudio,
  useGetMe,
  useGetEvaluation,
  useCreateTask,
  getGetEvaluationQueryKey,
  getListEvaluationsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Upload, Check, X, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/language-context";
import { LocalizedDatePicker } from "@/components/ui/localized-date-picker";

type ScoreLevel = "good" | "medium" | "poor";

export default function NewEvaluation() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const params = new URLSearchParams(search);
  const prefilledSpecialistId = params.get("specialistId") ?? "";
  const editIdParam = params.get("editId");
  const editId = editIdParam ? parseInt(editIdParam) : null;
  const isEditMode = editId !== null && !isNaN(editId);

  const { data: me } = useGetMe();

  // Redirect specialists away from this page
  useEffect(() => {
    if (me && me.role === "user") {
      setLocation("/evaluations");
    }
  }, [me, setLocation]);

  const { data: specialists, isLoading: isLoadingSpec } = useListSpecialists({ archived: false });
  const { data: sections, isLoading: isLoadingSec } = useListCriteriaSections();
  const { data: existingEval, isLoading: isLoadingExisting } = useGetEvaluation(editId ?? 0, {
    query: { enabled: isEditMode, queryKey: getGetEvaluationQueryKey(editId ?? 0) }
  });

  const createEvaluation = useCreateEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const finalizeEvaluation = useFinalizeEvaluation();
  const attachAudio = useAttachEvaluationAudio();
  const createTask = useCreateTask();

  const [formData, setFormData] = useState({
    specialistId: prefilledSpecialistId,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().substring(0, 5),
    clientName: "",
    evaluationType: "call" as "call" | "meeting" | "chat"
  });

  const [scores, setScores] = useState<Record<number, { level: ScoreLevel; comment: string }>>({});
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState(() => new Date().toISOString().split("T")[0]);
  const [lastEvaluationId, setLastEvaluationId] = useState<number | null>(null);
  const [localTasks, setLocalTasks] = useState<Array<{ id: number; description: string; deadline: string }>>([]);

  useEffect(() => {
    if (isEditMode && existingEval && !prefilled) {
      setFormData({
        specialistId: existingEval.specialistId.toString(),
        date: existingEval.date,
        time: existingEval.time,
        clientName: existingEval.clientName,
        evaluationType: existingEval.evaluationType as "call" | "meeting" | "chat",
      });
      const initialScores: Record<number, { level: ScoreLevel; comment: string }> = {};
      existingEval.criteriaScores?.forEach(cs => {
        initialScores[cs.criterionId] = {
          level: cs.level as ScoreLevel,
          comment: cs.comment ?? "",
        };
      });
      setScores(initialScores);
      setPrefilled(true);
    }
  }, [existingEval, isEditMode, prefilled]);

  const calculateScore = () => {
    if (!sections) return { total: 0, bySection: {} as Record<number, { score: number; max: number; percentage: number }>, level: "" };

    let totalScore = 0;
    let totalWeight = 0;
    const bySection: Record<number, { score: number; max: number; percentage: number }> = {};

    sections.forEach(section => {
      let secScore = 0;
      let secMax = 0;

      section.criteria.forEach(crit => {
        secMax += crit.weight;
        totalWeight += crit.weight;

        const critScore = scores[crit.id];
        if (critScore) {
          const val = critScore.level === "good" ? crit.weight : critScore.level === "medium" ? crit.weight * 0.6 : 0;
          secScore += val;
          totalScore += val;
        }
      });

      bySection[section.id] = {
        score: secScore,
        max: secMax,
        percentage: secMax > 0 ? (secScore / secMax) * 100 : 0
      };
    });

    const finalScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
    const level = finalScore >= 80 ? t.newEval.excellent : finalScore >= 70 ? t.newEval.good : t.newEval.poor;

    return { total: Math.round(finalScore), bySection, level };
  };

  const { total, bySection, level } = useMemo(calculateScore, [scores, sections, t]);

  const handleScoreChange = (critId: number, lvl: ScoreLevel) => {
    setScores(prev => ({
      ...prev,
      [critId]: { level: lvl, comment: prev[critId]?.comment || "" }
    }));
  };

  const handleCommentChange = (critId: number, comment: string) => {
    setScores(prev => ({
      ...prev,
      [critId]: { level: prev[critId]?.level || "poor", comment }
    }));
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const saveEvaluation = async (finalize: boolean) => {
    if (!formData.specialistId || !formData.clientName) {
      toast({ variant: "destructive", title: t.newEval.requiredFields, description: t.newEval.requiredDesc });
      return;
    }

    const criteriaScores = Object.entries(scores).map(([id, data]) => ({
      criterionId: parseInt(id),
      level: data.level,
      comment: data.comment || undefined,
    }));

    setIsSaving(true);
    try {
      let evaluationId: number;

      if (isEditMode && editId) {
        await updateEvaluation.mutateAsync({
          id: editId,
          data: {
            date: formData.date,
            time: formData.time,
            clientName: formData.clientName,
            evaluationType: formData.evaluationType,
            criteriaScores,
          }
        });
        evaluationId = editId;
      } else {
        const evaluation = await createEvaluation.mutateAsync({
          data: {
            specialistId: parseInt(formData.specialistId),
            date: formData.date,
            time: formData.time,
            clientName: formData.clientName,
            evaluationType: formData.evaluationType,
          }
        });
        evaluationId = evaluation.id;

        if (criteriaScores.length > 0) {
          await updateEvaluation.mutateAsync({
            id: evaluationId,
            data: { criteriaScores }
          });
        }
      }

      if (audioFile) {
        try {
          const base64 = await fileToBase64(audioFile);
          await attachAudio.mutateAsync({ id: evaluationId, data: { audioUrl: base64 } as any });
        } catch {
          toast({ variant: "destructive", title: t.newEval.audioError });
        }
      }

      if (finalize) {
        await finalizeEvaluation.mutateAsync({ id: evaluationId });
        toast({ title: t.newEval.finalized });
      } else {
        toast({ title: t.newEval.draftSaved });
      }

      await queryClient.invalidateQueries({ queryKey: getListEvaluationsQueryKey() });
      setLastEvaluationId(evaluationId);
      setLocation(`/evaluations/${evaluationId}`);
    } catch {
      toast({ variant: "destructive", title: t.newEval.saveError, description: t.newEval.saveErrorDesc });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSpec || isLoadingSec || (isEditMode && isLoadingExisting)) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const levelColor = level === t.newEval.excellent ? "bg-green-100 text-green-700"
    : level === t.newEval.good ? "bg-orange-100 text-orange-700"
    : "bg-red-100 text-red-700";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.newEval.leaveTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.newEval.leaveDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.newEval.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={() => setLocation("/evaluations")}>{t.newEval.leave}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <h2 className="text-3xl font-bold tracking-tight">
          {isEditMode ? t.newEval.editTitle : t.newEval.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.newEval.details}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.newEval.specialistLabel}</Label>
                  <Select value={formData.specialistId} onValueChange={v => setFormData({ ...formData, specialistId: v })}>
                    <SelectTrigger><SelectValue placeholder={t.newEval.selectSpecialist} /></SelectTrigger>
                    <SelectContent>
                      {specialists?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.newEval.clientLabel}</Label>
                  <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} placeholder={t.newEval.clientPlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label>{t.newEval.dateLabel}</Label>
                  <LocalizedDatePicker value={formData.date} onChange={v => setFormData({ ...formData, date: v })} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label>{t.newEval.timeLabel}</Label>
                  <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.newEval.typeLabel}</Label>
                  <Select value={formData.evaluationType} onValueChange={(v: "call" | "meeting" | "chat") => setFormData({ ...formData, evaluationType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">{t.newEval.typeCall}</SelectItem>
                      <SelectItem value="meeting">{t.newEval.typeMeeting}</SelectItem>
                      <SelectItem value="chat">{t.newEval.typeChat}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.newEval.evaluatorLabel}</Label>
                  <Input value={me?.username || ""} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">{t.newEval.criteriaTitle}</h3>
            <Accordion type="multiple" className="w-full" defaultValue={sections?.map(s => s.id.toString())}>
              {sections?.map(section => (
                <AccordionItem key={section.id} value={section.id.toString()} className="border bg-card rounded-lg px-4 mb-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex justify-between w-full pr-4 items-center">
                      <span className="font-semibold text-lg">{section.name}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {bySection[section.id]?.percentage.toFixed(0) || 0}% ({section.totalWeight} pct)
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6 pt-4 border-t">
                    {section.criteria.map(crit => (
                      <div key={crit.id} className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="font-medium max-w-[70%]">{crit.name}</div>
                          <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">{t.newEval.weight}: {crit.weight}</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant={scores[crit.id]?.level === "poor" ? "default" : "outline"}
                            className={scores[crit.id]?.level === "poor" ? "bg-red-500 hover:bg-red-600" : ""}
                            onClick={() => handleScoreChange(crit.id, "poor")}
                            size="sm"
                          >
                            <X className="mr-1 h-3 w-3" /> {t.newEval.levelPoor}
                          </Button>
                          <Button
                            type="button"
                            variant={scores[crit.id]?.level === "medium" ? "default" : "outline"}
                            className={scores[crit.id]?.level === "medium" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            onClick={() => handleScoreChange(crit.id, "medium")}
                            size="sm"
                          >
                            <Minus className="mr-1 h-3 w-3" /> {t.newEval.levelMedium}
                          </Button>
                          <Button
                            type="button"
                            variant={scores[crit.id]?.level === "good" ? "default" : "outline"}
                            className={scores[crit.id]?.level === "good" ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => handleScoreChange(crit.id, "good")}
                            size="sm"
                          >
                            <Check className="mr-1 h-3 w-3" /> {t.newEval.levelGood}
                          </Button>
                        </div>
                        <Textarea
                          placeholder={t.newEval.observations}
                          value={scores[crit.id]?.comment || ""}
                          onChange={e => handleCommentChange(crit.id, e.target.value)}
                          rows={2}
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        <div className="space-y-6">
          <div className="sticky top-6">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle>{t.newEval.scoreCard}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-semibold">{t.newEval.total}</p>
                    <p className="text-5xl font-bold">{total}<span className="text-2xl text-muted-foreground">/100</span></p>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-bold text-sm ${levelColor}`}>
                    {level}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  {sections?.map(s => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span className="truncate max-w-[150px]">{s.name}</span>
                      <span className="font-medium">{bySection[s.id]?.percentage.toFixed(0) || 0}%</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div>
                    <Label className="mb-2 block">{t.newEval.audio}</Label>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleAudioChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate min-w-0">
                        {audioFile ? audioFile.name : t.newEval.selectAudio}
                      </span>
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 pt-4">
                    <Button
                      onClick={() => saveEvaluation(true)}
                      className="w-full"
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t.newEval.finalize}
                    </Button>
                    <Button
                      onClick={() => saveEvaluation(false)}
                      variant="secondary"
                      className="w-full"
                      disabled={isSaving}
                    >
                      {isEditMode ? t.newEval.saveChanges : t.newEval.saveDraft}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsTaskDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t.newEval.addTask}
                    </Button>
                  </div>

                  {localTasks.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{t.newEval.addTask}</p>
                      {localTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{task.description}</p>
                            <p className="text-xs text-muted-foreground">{task.deadline}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.newEval.addTask}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label>{t.newEval.taskDescription}</Label>
                          <Textarea
                            value={taskDescription}
                            onChange={e => setTaskDescription(e.target.value)}
                            placeholder={t.newEval.taskDescription}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.newEval.taskDeadline}</Label>
                          <LocalizedDatePicker value={taskDeadline} onChange={setTaskDeadline} className="w-full" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>{t.newEval.cancel}</Button>
                        <Button
                          disabled={!taskDescription.trim() || createTask.isPending}
                          onClick={async () => {
                            const specialistId = formData.specialistId ? parseInt(formData.specialistId) : undefined;
                            if (!taskDescription.trim()) return;
                            try {
                              const taskData: { description: string; deadline: string; specialistId?: number; evaluationId?: number } = {
                                description: taskDescription,
                                deadline: taskDeadline,
                              };
                              if (lastEvaluationId != null) taskData.evaluationId = lastEvaluationId;
                              if (specialistId != null) taskData.specialistId = specialistId;
                              const created = await createTask.mutateAsync({ data: taskData as any });
                              setLocalTasks(prev => [...prev, { id: created.id, description: created.description, deadline: created.deadline }]);
                              toast({ title: t.newEval.taskAdded });
                              setIsTaskDialogOpen(false);
                              setTaskDescription("");
                            } catch {
                              toast({ variant: "destructive", title: t.newEval.saveError });
                            }
                          }}
                        >
                          {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {t.common.save}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
