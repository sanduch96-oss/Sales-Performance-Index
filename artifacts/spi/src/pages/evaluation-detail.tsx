import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetEvaluation, 
  getGetEvaluationQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Play, Calendar, User, UserCheck, ClipboardList, MessageSquare, CheckCircle2, XCircle, Send } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/language-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function EvaluationDetail() {
  const { id } = useParams();
  const evaluationId = parseInt(id || "0");
  const { t } = useLanguage();
  const { data: user } = useGetMe();
  const qc = useQueryClient();
  
  const [disagreeOpen, setDisagreeOpen] = useState(false);
  const [disagreeMsg, setDisagreeMsg] = useState("");
  const [replyMsg, setReplyMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data: evaluation, isLoading } = useGetEvaluation(evaluationId, { 
    query: { enabled: !!evaluationId, queryKey: getGetEvaluationQueryKey(evaluationId) } 
  });

  const isSpecialist = user?.role === "user";
  const isEvaluator = user?.role === "admin" || user?.role === "evaluator";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetEvaluationQueryKey(evaluationId) });
  };

  const handleAgree = async () => {
    setSending(true);
    try {
      await customFetch(`/api/evaluations/${evaluationId}/agree`, { method: "POST" });
      invalidate();
    } finally {
      setSending(false);
    }
  };

  const handleDisagree = async () => {
    if (!disagreeMsg.trim()) return;
    setSending(true);
    try {
      await customFetch(`/api/evaluations/${evaluationId}/disagree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: disagreeMsg }),
      });
      setDisagreeOpen(false);
      setDisagreeMsg("");
      invalidate();
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyMsg.trim()) return;
    setSending(true);
    try {
      await customFetch(`/api/evaluations/${evaluationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMsg }),
      });
      setReplyMsg("");
      invalidate();
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!evaluation) {
    return <div>{t.evalDetail.unavailable}</div>;
  }

  const ev = evaluation as typeof evaluation & {
    specialistStatus?: string | null;
    tasks?: { id: number; description: string; deadline: string; createdAt: string }[];
    comments?: { id: number; authorName: string; authorRole: string; message: string; createdAt: string }[];
  };

  const scoreLevel = ev.totalScore && ev.totalScore >= 80 ? t.evalDetail.excellent
                   : ev.totalScore && ev.totalScore >= 70 ? t.evalDetail.good : t.evalDetail.poor;

  const criteriaBySection: Record<string, typeof evaluation.criteriaScores> = {};
  evaluation.criteriaScores?.forEach(c => {
    if (!criteriaBySection[c.sectionName]) {
      criteriaBySection[c.sectionName] = [];
    }
    criteriaBySection[c.sectionName].push(c);
  });

  const tasks = ev.tasks ?? [];
  const comments = ev.comments ?? [];
  const specialistStatus = ev.specialistStatus ?? null;

  const showResponseButtons = isSpecialist && ev.status === "finalized" && !specialistStatus;
  const showConversation = comments.length > 0;
  const showReplyBox = isEvaluator && comments.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/evaluations">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t.evalDetail.title}</h2>
          <p className="text-muted-foreground">ID: #{evaluation.id} • {evaluation.status === "finalized" ? t.evalDetail.finalized : t.evalDetail.draft}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {specialistStatus === "agreed" && (
            <Badge className="bg-green-500 text-white flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t.evalDetail.agreedBadge}
            </Badge>
          )}
          {specialistStatus === "disagreed" && (
            <Badge className="bg-red-500 text-white flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {t.evalDetail.disagreedBadge}
            </Badge>
          )}
          {evaluation.status === "draft" && isEvaluator && (
            <Link href={`/evaluations/new?editId=${evaluation.id}`}>
              <Button variant="default">{t.evalDetail.editDraft}</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><User className="mr-2 h-4 w-4" /> {t.evalDetail.specialist}</p>
                <p className="font-semibold">{evaluation.specialistName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><UserCheck className="mr-2 h-4 w-4" /> {t.evalDetail.evaluator}</p>
                <p className="font-semibold">{evaluation.evaluatorName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" /> {t.evalDetail.date}</p>
                <p className="font-semibold">{new Date(evaluation.date).toLocaleDateString()} {evaluation.time}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t.evalDetail.clientType}</p>
                <p className="font-semibold">{evaluation.clientName} ({evaluation.evaluationType})</p>
              </div>
            </div>
            
            {evaluation.audioUrl && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-semibold mb-2 flex items-center"><Play className="mr-2 h-4 w-4" /> {t.evalDetail.audio}</p>
                <audio controls className="w-full h-10" src={evaluation.audioUrl}></audio>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 flex flex-col justify-center items-center p-6">
          <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-2">{t.evalDetail.totalScore}</p>
          <div className="text-6xl font-bold text-foreground mb-4">
            {evaluation.totalScore !== null ? evaluation.totalScore : "-"}
            <span className="text-3xl text-muted-foreground">/100</span>
          </div>
          {evaluation.totalScore !== null && (
            <Badge className={`text-base px-4 py-1 ${scoreLevel === t.evalDetail.excellent ? "bg-green-500" : scoreLevel === t.evalDetail.good ? "bg-orange-500" : "bg-red-500"}`}>
              {scoreLevel}
            </Badge>
          )}
        </Card>
      </div>

      {/* Tasks section */}
      {(tasks.length > 0 || isEvaluator) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {t.evalDetail.tasks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.evalDetail.noTasks}</p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.evalDetail.taskDeadline}: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Specialist response section */}
      {showResponseButtons && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.evalDetail.specialistResponse}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={handleAgree}
                disabled={sending}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t.evalDetail.agree}
              </Button>
              <Button
                variant="outline"
                className="border-red-400 text-red-600 hover:bg-red-50 gap-2"
                onClick={() => setDisagreeOpen(true)}
                disabled={sending}
              >
                <XCircle className="h-4 w-4" />
                {t.evalDetail.disagree}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation thread */}
      {showConversation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.evalDetail.conversation}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${comment.authorRole === "specialist" ? "bg-blue-50 border-blue-200" : "bg-muted/30 border-border"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{comment.message}</p>
              </div>
            ))}
            {showReplyBox && (
              <div className="pt-3 border-t space-y-2">
                <Textarea
                  placeholder={t.evalDetail.replyPlaceholder}
                  value={replyMsg}
                  onChange={(e) => setReplyMsg(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  disabled={!replyMsg.trim() || sending}
                  onClick={handleReply}
                  className="gap-2"
                >
                  <Send className="h-3 w-3" />
                  {t.evalDetail.send}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <h3 className="text-xl font-bold mt-8 mb-4">{t.evalDetail.criteria}</h3>
      
      <Accordion type="multiple" defaultValue={Object.keys(criteriaBySection)}>
        {Object.entries(criteriaBySection).map(([sectionName, criteria]) => {
          const sectionScore = evaluation.sectionScores?.find(s => s.sectionName === sectionName)?.averageScore;
          
          return (
            <AccordionItem key={sectionName} value={sectionName} className="bg-card border rounded-lg px-4 mb-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex justify-between w-full pr-4 items-center">
                  <span className="font-semibold text-lg">{sectionName}</span>
                  <span className="font-bold text-primary">{sectionScore !== null ? `${sectionScore}%` : "-"}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 border-t">
                <div className="space-y-4">
                  {criteria.map(crit => (
                    <div key={crit.id} className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{crit.criterionName}</div>
                        <Badge variant="outline" className={
                          crit.level === "good" ? "bg-green-100 text-green-800 border-green-200" : 
                          crit.level === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : 
                          "bg-red-100 text-red-800 border-red-200"
                        }>
                          {crit.level === "good" ? t.evalDetail.levelGood : crit.level === "medium" ? t.evalDetail.levelMedium : t.evalDetail.levelPoor}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">{t.evalDetail.weight}: {crit.weight} • {t.evalDetail.obtainedScore}: {crit.score}</div>
                      {crit.comment && (
                        <div className="text-sm bg-background p-3 rounded border mt-3">
                          <span className="font-semibold block mb-1">{t.evalDetail.observations}:</span>
                          {crit.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Disagree dialog */}
      <Dialog open={disagreeOpen} onOpenChange={setDisagreeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.evalDetail.disagreedTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>{t.evalDetail.disagreedLabel}</Label>
            <Textarea
              value={disagreeMsg}
              onChange={(e) => setDisagreeMsg(e.target.value)}
              rows={4}
              placeholder={t.evalDetail.replyPlaceholder}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisagreeOpen(false)}>{t.common?.close ?? "Închide"}</Button>
            <Button
              disabled={!disagreeMsg.trim() || sending}
              onClick={handleDisagree}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {t.evalDetail.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
