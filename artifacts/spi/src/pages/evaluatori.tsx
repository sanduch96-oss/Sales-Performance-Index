import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  UserPlus, Copy, Check, Loader2, UserCheck, Eye, EyeOff,
  ClipboardList, CalendarDays, Trash2, Plus, ChevronRight,
  BarChart2, FileText,
} from "lucide-react";

interface Evaluator {
  id: number;
  username: string;
  email: string | null;
  emailVerified: boolean;
  lastPlainPassword: string | null;
}

interface CreatedEvaluator {
  id: number;
  username: string;
  password: string;
}

interface EvaluationSummary {
  id: number;
  date: string;
  clientName: string;
  status: string;
  totalScore: number | null;
  specialistFirstName: string | null;
  specialistLastName: string | null;
}

interface Assignment {
  id: number;
  specialistId: number;
  specialistFirstName: string | null;
  specialistLastName: string | null;
  specialistPosition: string | null;
  dayOfMonth: number;
  evaluationsCount: number;
}

interface EvaluatorProfile {
  evaluator: { id: number; username: string; email: string | null; totalEvaluations: number; createdAt: string };
  evaluations: EvaluationSummary[];
  assignments: Assignment[];
}

interface Specialist {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
}

// ── Mici utilitare ────────────────────────────────────────────────
function statusLabel(s: string) {
  if (s === "completed") return { label: "Finalizat", color: "bg-green-100 text-green-800" };
  if (s === "draft") return { label: "Ciornă", color: "bg-yellow-100 text-yellow-800" };
  return { label: s, color: "bg-gray-100 text-gray-700" };
}

// ── Card Evaluator ────────────────────────────────────────────────
function EvaluatorCard({ ev, onOpenProfile }: { ev: Evaluator; onOpenProfile: (ev: Evaluator) => void }) {
  const [showPass, setShowPass] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const copyText = async (text: string, type: "login" | "pass") => {
    await navigator.clipboard.writeText(text);
    if (type === "login") { setCopiedLogin(true); setTimeout(() => setCopiedLogin(false), 2000); }
    else { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {ev.username.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{ev.username}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Login</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-2 py-1 rounded text-xs font-mono truncate">{ev.username}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyText(ev.username, "login")}>
              {copiedLogin ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Parolă</p>
          {ev.lastPlainPassword ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-2 py-1 rounded text-xs font-mono tracking-widest truncate">
                {showPass ? ev.lastPlainPassword : "••••••••••"}
              </code>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyText(ev.lastPlainPassword!, "pass")}>
                {copiedPass ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Parolă necunoscută</p>
          )}
        </div>

        {ev.email && (
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-muted-foreground shrink-0">Email:</span>
            <span className="truncate">{ev.email}</span>
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenProfile(ev)}>
            <BarChart2 className="mr-2 h-3.5 w-3.5" />
            Vezi profil & sarcini
            <ChevronRight className="ml-auto h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Modal Profil Evaluator ────────────────────────────────────────
function ProfileModal({ ev, open, onClose }: { ev: Evaluator; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [newSpecialistId, setNewSpecialistId] = useState("");
  const [newDay, setNewDay] = useState("");
  const [newCount, setNewCount] = useState("1");

  const { data: profile, isLoading } = useQuery<EvaluatorProfile>({
    queryKey: ["evaluator-profile", ev.id],
    queryFn: () => customFetch<EvaluatorProfile>(`/api/evaluatori/${ev.id}/profile`),
    enabled: open,
  });

  // Folosim endpoint-ul existent /api/specialists (fără archived=true = returnează activi)
  const { data: specialists = [] } = useQuery<Specialist[]>({
    queryKey: ["specialists"],
    queryFn: () => customFetch<Specialist[]>("/api/specialists"),
    enabled: open,
  });

  const addAssignment = useMutation({
    mutationFn: () =>
      customFetch(`/api/evaluatori/${ev.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialistId: parseInt(newSpecialistId),
          dayOfMonth: parseInt(newDay),
          evaluationsCount: parseInt(newCount),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluator-profile", ev.id] });
      setNewSpecialistId(""); setNewDay(""); setNewCount("1");
      toast({ title: "Sarcină adăugată" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Eroare", description: err?.message }),
  });

  const deleteAssignment = useMutation({
    mutationFn: (assignmentId: number) =>
      customFetch(`/api/evaluatori/${ev.id}/assignments/${assignmentId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluator-profile", ev.id] });
      toast({ title: "Sarcină ștearsă" });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Eroare", description: err?.message }),
  });

  const dayNum = parseInt(newDay);
  const canAdd = newSpecialistId && newDay && dayNum >= 1 && dayNum <= 31 && parseInt(newCount) >= 1;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {ev.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg">{ev.username}</div>
              {ev.email && <div className="text-sm text-muted-foreground font-normal">{ev.email}</div>}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : profile ? (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">

            {/* Statistici */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4 flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-primary/60" />
                <div>
                  <div className="text-2xl font-bold">{profile.evaluator.totalEvaluations}</div>
                  <div className="text-xs text-muted-foreground">Evaluări efectuate</div>
                </div>
              </div>
              <div className="rounded-lg border p-4 flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-primary/60" />
                <div>
                  <div className="text-2xl font-bold">{profile.assignments.length}</div>
                  <div className="text-xs text-muted-foreground">Sarcini planificate</div>
                </div>
              </div>
            </div>

            {/* Sarcini alocate */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Sarcini lunare alocate
                <Badge variant="secondary" className="ml-auto text-xs">{profile.assignments.length} total</Badge>
              </h3>

              {profile.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nicio sarcină alocată încă.</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {profile.assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      {/* Ziua — evidențiată */}
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0 border">
                        <span className="text-xs text-muted-foreground leading-none">zi</span>
                        <span className="text-base font-bold text-primary leading-tight">{a.dayOfMonth}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {a.specialistFirstName} {a.specialistLastName}
                        </div>
                        {a.specialistPosition && (
                          <div className="text-xs text-muted-foreground">{a.specialistPosition}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {a.evaluationsCount} eval.
                      </Badge>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => deleteAssignment.mutate(a.id)}
                        disabled={deleteAssignment.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formular adăugare sarcină */}
              <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Adaugă sarcină nouă
                </p>
                <p className="text-xs text-muted-foreground -mt-1">
                  Poți adăuga mai multe sarcini pentru zile diferite, inclusiv pentru același specialist.
                </p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Specialist</Label>
                    <Select value={newSpecialistId} onValueChange={setNewSpecialistId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selectează specialist..." />
                      </SelectTrigger>
                      <SelectContent>
                        {specialists.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.firstName} {s.lastName}
                            {s.position ? ` — ${s.position}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Ziua lunii (1–31)</Label>
                      <Input
                        type="number" min={1} max={31} placeholder="ex: 15"
                        className="h-9" value={newDay}
                        onChange={e => setNewDay(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nr. evaluări în acea zi</Label>
                      <Input
                        type="number" min={1} placeholder="ex: 2"
                        className="h-9" value={newCount}
                        onChange={e => setNewCount(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!canAdd || addAssignment.isPending}
                    onClick={() => addAssignment.mutate()}
                  >
                    {addAssignment.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Plus className="mr-2 h-4 w-4" />}
                    Adaugă sarcină
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista evaluări */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Evaluări efectuate ({profile.evaluations.length})
              </h3>

              {profile.evaluations.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nu există evaluări.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {profile.evaluations.map(e => {
                    const st = statusLabel(e.status);
                    return (
                      <button
                        key={e.id}
                        className="w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                        onClick={() => { onClose(); navigate(`/evaluari/${e.id}`); }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {e.specialistFirstName} {e.specialistLastName}
                            <span className="text-muted-foreground font-normal ml-2">— {e.clientName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{e.date}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {e.totalScore != null && (
                            <span className="text-xs font-semibold">{e.totalScore.toFixed(1)}%</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Închide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pagina principală ─────────────────────────────────────────────
export default function Evaluatori() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [numeComplet, setNumeComplet] = useState("");
  const [created, setCreated] = useState<CreatedEvaluator | null>(null);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [profileEv, setProfileEv] = useState<Evaluator | null>(null);

  const { data: evaluatori = [], isLoading } = useQuery<Evaluator[]>({
    queryKey: ["evaluatori"],
    queryFn: () => customFetch<Evaluator[]>("/api/evaluatori"),
  });

  const createMutation = useMutation({
    mutationFn: (numeComplet: string) =>
      customFetch<CreatedEvaluator>("/api/evaluatori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeComplet }),
      }),
    onSuccess: (data) => { setCreated(data); qc.invalidateQueries({ queryKey: ["evaluatori"] }); },
    onError: (err: any) => toast({ variant: "destructive", title: "Eroare", description: err?.message ?? "Nu s-a putut crea evaluatorul." }),
  });

  const openDialog = () => {
    setNumeComplet(""); setCreated(null);
    setCopiedLogin(false); setCopiedPass(false); setShowPass(false);
    setDialogOpen(true);
  };

  const copyText = async (text: string, type: "login" | "pass") => {
    await navigator.clipboard.writeText(text);
    if (type === "login") { setCopiedLogin(true); setTimeout(() => setCopiedLogin(false), 2000); }
    else { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluatori</h1>
          <p className="text-muted-foreground mt-1">Gestionați evaluatorii și sarcinile acestora.</p>
        </div>
        <Button onClick={openDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adaugă evaluator
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : evaluatori.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nu există evaluatori înregistrați.</p>
            <Button variant="outline" className="mt-4" onClick={openDialog}>
              <UserPlus className="mr-2 h-4 w-4" /> Adaugă primul evaluator
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evaluatori.map((ev) => (
            <EvaluatorCard key={ev.id} ev={ev} onOpenProfile={setProfileEv} />
          ))}
        </div>
      )}

      {/* Modal profil */}
      {profileEv && (
        <ProfileModal ev={profileEv} open={!!profileEv} onClose={() => setProfileEv(null)} />
      )}

      {/* Dialog creare evaluator */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Adaugă evaluator
            </DialogTitle>
          </DialogHeader>

          {!created ? (
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(numeComplet); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numeComplet">Nume și prenume</Label>
                <Input
                  id="numeComplet" value={numeComplet} onChange={(e) => setNumeComplet(e.target.value)}
                  required placeholder="Ex: Ion Popescu" autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">Login-ul și parola vor fi generate automat.</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Anulare</Button>
                <Button type="submit" disabled={createMutation.isPending || !numeComplet.trim()}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generează
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">Evaluator creat cu succes!</p>
                <p className="text-xs text-green-600 mt-1">Salvați credențialele de mai jos.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Login</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">{created.username}</code>
                    <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => copyText(created.username, "login")}>
                      {copiedLogin ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Parolă</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono tracking-widest">
                      {showPass ? created.password : "••••••••"}
                    </code>
                    <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setShowPass(v => !v)}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => copyText(created.password, "pass")}>
                      {copiedPass ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1" onClick={openDialog}>
                  <UserPlus className="mr-2 h-4 w-4" /> Adaugă altul
                </Button>
                <Button type="button" className="flex-1" onClick={() => setDialogOpen(false)}>Gata</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
