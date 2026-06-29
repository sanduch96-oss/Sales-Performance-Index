import { useListEvaluations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, CalendarIcon, UserIcon, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function getScoreBadge(score: number | null) {
  if (score === null) return null;
  if (score >= 80) return <Badge className="bg-green-500 hover:bg-green-600">Excelent</Badge>;
  if (score >= 70) return <Badge className="bg-orange-500 hover:bg-orange-600">Bun</Badge>;
  return <Badge variant="destructive">Slab</Badge>;
}

export default function Evaluations() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: evaluations, isLoading } = useListEvaluations();

  const filtered = evaluations?.filter(ev => 
    ev.specialistName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ev.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Evaluări</h2>
          <p className="text-muted-foreground">Lista tuturor evaluărilor realizate în sistem.</p>
        </div>
        <Link href="/evaluations/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Evaluare nouă</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <Input 
              placeholder="Caută după specialist sau client..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p>Nu s-au găsit evaluări.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Specialist</th>
                    <th className="px-6 py-3 font-medium">Data & Ora</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Tip</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Scor</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map(ev => (
                    <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          {ev.specialistName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(ev.date).toLocaleDateString()} {ev.time}
                        </div>
                      </td>
                      <td className="px-6 py-4 truncate max-w-[200px]">{ev.clientName}</td>
                      <td className="px-6 py-4 capitalize">{ev.evaluationType}</td>
                      <td className="px-6 py-4">
                        {ev.status === "finalized" ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" /> <span className="text-xs font-medium">Finalizat</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-500">
                            <Clock className="h-4 w-4" /> <span className="text-xs font-medium">Draft</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {getScoreBadge(ev.totalScore)}
                          <span className="font-bold">{ev.totalScore !== null ? `${ev.totalScore}/100` : "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/evaluations/${ev.id}`}>
                          <Button variant="ghost" size="sm">Vezi</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
