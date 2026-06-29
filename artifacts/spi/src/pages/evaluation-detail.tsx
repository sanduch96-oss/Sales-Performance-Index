import { useParams, Link } from "wouter";
import { 
  useGetEvaluation, 
  getGetEvaluationQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Play, Calendar, User, UserCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function EvaluationDetail() {
  const { id } = useParams();
  const evaluationId = parseInt(id || "0");
  
  const { data: evaluation, isLoading } = useGetEvaluation(evaluationId, { 
    query: { enabled: !!evaluationId, queryKey: getGetEvaluationQueryKey(evaluationId) } 
  });

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!evaluation) {
    return <div>Evaluare indisponibilă</div>;
  }

  const scoreLevel = evaluation.totalScore && evaluation.totalScore >= 80 ? "Excelent" 
                   : evaluation.totalScore && evaluation.totalScore >= 70 ? "Bun" : "Slab";

  // Group criteria by section
  const criteriaBySection: Record<string, typeof evaluation.criteriaScores> = {};
  evaluation.criteriaScores?.forEach(c => {
    if (!criteriaBySection[c.sectionName]) {
      criteriaBySection[c.sectionName] = [];
    }
    criteriaBySection[c.sectionName].push(c);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/evaluations">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detalii evaluare</h2>
          <p className="text-muted-foreground">ID: #{evaluation.id} • {evaluation.status === "finalized" ? "Finalizată" : "Draft"}</p>
        </div>
        {evaluation.status === "draft" && (
          <div className="ml-auto">
            <Button variant="default">Editează draft</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><User className="mr-2 h-4 w-4" /> Specialist</p>
                <p className="font-semibold">{evaluation.specialistName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><UserCheck className="mr-2 h-4 w-4" /> Evaluator</p>
                <p className="font-semibold">{evaluation.evaluatorName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" /> Data</p>
                <p className="font-semibold">{new Date(evaluation.date).toLocaleDateString()} {evaluation.time}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Client / Tip</p>
                <p className="font-semibold">{evaluation.clientName} ({evaluation.evaluationType})</p>
              </div>
            </div>
            
            {evaluation.audioUrl && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-semibold mb-2 flex items-center"><Play className="mr-2 h-4 w-4" /> Înregistrare audio</p>
                <audio controls className="w-full h-10" src={evaluation.audioUrl}></audio>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 flex flex-col justify-center items-center p-6">
          <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-2">Scor Total</p>
          <div className="text-6xl font-bold text-foreground mb-4">
            {evaluation.totalScore !== null ? evaluation.totalScore : "-"}
            <span className="text-3xl text-muted-foreground">/100</span>
          </div>
          {evaluation.totalScore !== null && (
            <Badge className={`text-base px-4 py-1 ${scoreLevel === "Excelent" ? "bg-green-500" : scoreLevel === "Bun" ? "bg-orange-500" : "bg-red-500"}`}>
              {scoreLevel}
            </Badge>
          )}
        </Card>
      </div>

      <h3 className="text-xl font-bold mt-8 mb-4">Criterii evaluate</h3>
      
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
                          {crit.level === "good" ? "Bun (100%)" : crit.level === "medium" ? "Mediu (60%)" : "Slab (0%)"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">Pondere: {crit.weight} • Punctaj obținut: {crit.score}</div>
                      {crit.comment && (
                        <div className="text-sm bg-background p-3 rounded border mt-3">
                          <span className="font-semibold block mb-1">Observații:</span>
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
    </div>
  );
}
