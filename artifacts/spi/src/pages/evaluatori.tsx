import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Copy, Check, Loader2, UserCheck, Eye, EyeOff } from "lucide-react";

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

function EvaluatorCard({ ev }: { ev: Evaluator }) {
  const [showPass, setShowPass] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const copyText = async (text: string, type: "login" | "pass") => {
    await navigator.clipboard.writeText(text);
    if (type === "login") {
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {ev.username.charAt(0).toUpperCase()}
          </div>
          {ev.username}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Login row */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Login</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-2 py-1 rounded text-xs font-mono">{ev.username}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyText(ev.username, "login")}>
              {copiedLogin ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Password row */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Parolă</p>
          {ev.lastPlainPassword ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-2 py-1 rounded text-xs font-mono tracking-widest">
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
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Email:</span>
            <span className="truncate max-w-[160px]">{ev.email}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Rol:</span>
          <Badge variant="secondary">Evaluator</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Evaluatori() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [numeComplet, setNumeComplet] = useState("");
  const [created, setCreated] = useState<CreatedEvaluator | null>(null);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
    onSuccess: (data) => {
      setCreated(data);
      qc.invalidateQueries({ queryKey: ["evaluatori"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Eroare", description: err?.message ?? "Nu s-a putut crea evaluatorul." });
    },
  });

  const openDialog = () => {
    setNumeComplet("");
    setCreated(null);
    setCopiedLogin(false);
    setCopiedPass(false);
    setShowPass(false);
    setDialogOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(numeComplet);
  };

  const copyText = async (text: string, type: "login" | "pass") => {
    await navigator.clipboard.writeText(text);
    if (type === "login") {
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluatori</h1>
          <p className="text-muted-foreground mt-1">Gestionați evaluatorii platformei.</p>
        </div>
        <Button onClick={openDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Adaugă evaluator
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : evaluatori.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nu există evaluatori înregistrați.</p>
            <Button variant="outline" className="mt-4" onClick={openDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adaugă primul evaluator
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evaluatori.map((ev) => (
            <EvaluatorCard key={ev.id} ev={ev} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Adaugă evaluator
            </DialogTitle>
          </DialogHeader>

          {!created ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numeComplet">Nume și prenume</Label>
                <Input
                  id="numeComplet"
                  value={numeComplet}
                  onChange={(e) => setNumeComplet(e.target.value)}
                  required
                  placeholder="Ex: Ion Popescu"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Login-ul și parola vor fi generate automat.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Anulare
                </Button>
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
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                      {created.username}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={() => copyText(created.username, "login")}
                    >
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
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowPass(v => !v)}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      onClick={() => copyText(created.password, "pass")}
                    >
                      {copiedPass ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={openDialog}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adaugă altul
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Gata
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
