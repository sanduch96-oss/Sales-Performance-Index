import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, CheckCircle2, Terminal } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [code, setCode] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await customFetch<{ ok: boolean; email: string; devCode?: string }>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email, role }),
      });
      setSentEmail(email);
      if (resp.devCode) {
        setDevCode(resp.devCode);
        setCode(resp.devCode);
      }
      setStep("verify");
    } catch (err: any) {
      const msg = err?.message ?? "Eroare la înregistrare";
      toast({ variant: "destructive", title: "Eroare", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await customFetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Cont creat cu succes", description: "Bun venit!" });
      setLocation("/dashboard");
    } catch (err: any) {
      const msg = err?.message ?? "Cod incorect sau expirat";
      toast({ variant: "destructive", title: "Eroare", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const resp2 = await customFetch<{ ok: boolean; devCode?: string }>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email, role }),
      });
      if (resp2.devCode) {
        setDevCode(resp2.devCode);
        setCode(resp2.devCode);
      }
      toast({ title: "Cod retrimis", description: `Verificați ${sentEmail}` });
    } catch {
      toast({ variant: "destructive", title: "Eroare la retrimitere" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="SPI Logo" className="h-44 w-auto" />
          </div>
        </CardHeader>

        {step === "form" ? (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nume utilizator</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Poștă electronică</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="exemplu@companie.md"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selectați rolul..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="evaluator">Evaluator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Înregistrare
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Aveți deja cont?{" "}
                <Link href="/login">
                  <span className="text-primary hover:underline cursor-pointer">Autentificare</span>
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <CardContent className="space-y-5">
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">Verificați posta electronică</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Am trimis un cod de 6 cifre la<br />
                    <span className="font-medium text-foreground">{sentEmail}</span>
                  </p>
                </div>
              </div>
              {devCode && (
                <div className="flex items-center gap-2 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700">
                  <Terminal className="h-4 w-4 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold">[DEV]</span> Cod completat automat:{" "}
                    <span className="font-mono font-bold tracking-widest">{devCode}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">Cod de confirmare</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono h-14"
                  placeholder="• • • • • •"
                  autoComplete="one-time-code"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Confirmare
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleResend}
                disabled={loading}
              >
                Nu ați primit codul? Retrimiteți
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setStep("form")}
              >
                ← Înapoi
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
