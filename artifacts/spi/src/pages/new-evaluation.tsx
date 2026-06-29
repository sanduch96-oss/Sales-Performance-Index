import { useState, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  useListSpecialists, 
  useListCriteriaSections, 
  useCreateEvaluation,
  useUpdateEvaluation,
  useFinalizeEvaluation,
  useAttachEvaluationAudio,
  useGetMe
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Upload, Check, X, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type ScoreLevel = "good" | "medium" | "poor";

export default function NewEvaluation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: me } = useGetMe();
  const { data: specialists, isLoading: isLoadingSpec } = useListSpecialists({ archived: false });
  const { data: sections, isLoading: isLoadingSec } = useListCriteriaSections();
  
  const createEvaluation = useCreateEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const finalizeEvaluation = useFinalizeEvaluation();
  const attachAudio = useAttachEvaluationAudio();
  
  const [formData, setFormData] = useState({
    specialistId: "",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
    clientName: "",
    evaluationType: "call" as "call" | "meeting" | "chat"
  });
  
  const [scores, setScores] = useState<Record<number, { level: ScoreLevel; comment: string }>>({});
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const calculateScore = () => {
    if (!sections) return { total: 0, bySection: {} as Record<number, { score: number; max: number; percentage: number }>, level: "Slab" };
    
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
    const level = finalScore >= 80 ? "Excelent" : finalScore >= 70 ? "Bun" : "Slab";
    
    return { total: Math.round(finalScore), bySection, level };
  };

  const { total, bySection, level } = useMemo(calculateScore, [scores, sections]);

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
      toast({ variant: "destructive", title: "Completați câmpurile obligatorii", description: "Specialist și client sunt obligatorii." });
      return;
    }

    const criteriaScores = Object.entries(scores).map(([id, data]) => ({
      criterionId: parseInt(id),
      level: data.level,
      comment: data.comment || undefined,
    }));

    setIsSaving(true);
    try {
      // Step 1: Create the evaluation
      const evaluation = await createEvaluation.mutateAsync({
        data: {
          specialistId: parseInt(formData.specialistId),
          date: formData.date,
          time: formData.time,
          clientName: formData.clientName,
          evaluationType: formData.evaluationType,
        }
      });

      // Step 2: Update with criteria scores
      if (criteriaScores.length > 0) {
        await updateEvaluation.mutateAsync({
          id: evaluation.id,
          data: { criteriaScores }
        });
      }

      // Step 3: Attach audio if provided
      if (audioFile) {
        try {
          const base64 = await fileToBase64(audioFile);
          await attachAudio.mutateAsync({
            id: evaluation.id,
            data: { audioUrl: base64 }
          });
        } catch {
          toast({ variant: "destructive", title: "Audio nu a putut fi atașat" });
        }
      }

      // Step 4: Finalize if requested
      if (finalize) {
        await finalizeEvaluation.mutateAsync({ id: evaluation.id });
        toast({ title: "Evaluare finalizată" });
      } else {
        toast({ title: "Draft salvat" });
      }

      setLocation(`/evaluations/${evaluation.id}`);
    } catch {
      toast({ variant: "destructive", title: "Eroare la salvare", description: "Vă rugăm încercați din nou." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSpec || isLoadingSec) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Părăsiți pagina?</AlertDialogTitle>
              <AlertDialogDescription>Toate datele nesalvate vor fi pierdute.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulare</AlertDialogCancel>
              <AlertDialogAction onClick={() => setLocation("/evaluations")}>Părăsește</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <h2 className="text-3xl font-bold tracking-tight">Evaluare nouă</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalii apel / întâlnire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Specialist *</Label>
                  <Select value={formData.specialistId} onValueChange={v => setFormData({...formData, specialistId: v})}>
                    <SelectTrigger><SelectValue placeholder="Selectează specialist" /></SelectTrigger>
                    <SelectContent>
                      {specialists?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.firstName} {s.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Input value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Nume client" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Ora</Label>
                  <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Tip evaluare</Label>
                  <Select value={formData.evaluationType} onValueChange={(v: "call" | "meeting" | "chat") => setFormData({...formData, evaluationType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Apel</SelectItem>
                      <SelectItem value="meeting">Întâlnire</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Evaluator</Label>
                  <Input value={me?.username || ""} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Criterii de evaluare</h3>
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
                          <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">Pondere: {crit.weight}</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            type="button"
                            variant={scores[crit.id]?.level === "poor" ? "default" : "outline"} 
                            className={scores[crit.id]?.level === "poor" ? "bg-red-500 hover:bg-red-600" : ""}
                            onClick={() => handleScoreChange(crit.id, "poor")}
                            size="sm"
                          >
                            <X className="mr-1 h-3 w-3" /> Slab (0%)
                          </Button>
                          <Button 
                            type="button"
                            variant={scores[crit.id]?.level === "medium" ? "default" : "outline"}
                            className={scores[crit.id]?.level === "medium" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            onClick={() => handleScoreChange(crit.id, "medium")}
                            size="sm"
                          >
                            <Minus className="mr-1 h-3 w-3" /> Mediu (60%)
                          </Button>
                          <Button 
                            type="button"
                            variant={scores[crit.id]?.level === "good" ? "default" : "outline"}
                            className={scores[crit.id]?.level === "good" ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => handleScoreChange(crit.id, "good")}
                            size="sm"
                          >
                            <Check className="mr-1 h-3 w-3" /> Bun (100%)
                          </Button>
                        </div>
                        <Textarea 
                          placeholder="Observații (opțional)" 
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
                <CardTitle>Scor evaluare</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-semibold">Total</p>
                    <p className="text-5xl font-bold">{total}<span className="text-2xl text-muted-foreground">/100</span></p>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                    level === "Excelent" ? "bg-green-100 text-green-700" : 
                    level === "Bun" ? "bg-orange-100 text-orange-700" : 
                    "bg-red-100 text-red-700"
                  }`}>
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
                    <Label className="mb-2 block">Atașează înregistrare (opțional)</Label>
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
                      className="w-full" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" /> 
                      {audioFile ? audioFile.name : "Selectează fișier audio"}
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-4">
                    <Button 
                      onClick={() => saveEvaluation(true)} 
                      className="w-full"
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Finalizează evaluarea
                    </Button>
                    <Button 
                      onClick={() => saveEvaluation(false)} 
                      variant="secondary" 
                      className="w-full"
                      disabled={isSaving}
                    >
                      Salvează draft
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
