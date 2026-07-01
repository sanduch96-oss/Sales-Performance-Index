import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";

type ResetStep = "email" | "code";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: () => setLocation("/dashboard"),
        onError: () => {
          toast({
            variant: "destructive",
            title: "Eroare la autentificare",
            description: "Verificați credențialele și încercați din nou.",
          });
        },
      }
    );
  };

  const openReset = () => {
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setResetNewPassword("");
    setResetOpen(true);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await customFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetStep("code");
      toast({ title: "Cod trimis", description: `Verificați ${resetEmail}` });
    } catch {
      toast({ variant: "destructive", title: "Eroare", description: "Verificați adresa de e-mail." });
    } finally {
      setResetLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.length < 6) {
      toast({ variant: "destructive", title: "Parolă prea scurtă", description: "Minimum 6 caractere." });
      return;
    }
    setResetLoading(true);
    try {
      await customFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPassword }),
      });
      setResetOpen(false);
      toast({ title: "Parolă resetată", description: "Autentificați-vă cu noua parolă." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Eroare", description: err?.message ?? "Cod incorect sau expirat." });
    } finally {
      setResetLoading(false);
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
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={openReset}
              >
                Ați uitat parola?
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Autentificare
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Nu aveți cont?{" "}
              <Link href="/register">
                <span className="text-primary hover:underline cursor-pointer">Înregistrare</span>
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Resetare parolă
            </DialogTitle>
          </DialogHeader>

          {resetStep === "email" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 py-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Introduceți posta electronică asociată contului.<br />
                  Vă vom expedia un cod de resetare.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Poștă electronică</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="exemplu@companie.md"
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Trimiteți codul
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 py-1">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Cod trimis la <span className="font-medium text-foreground">{resetEmail}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-code">Codul primit</Label>
                <Input
                  id="reset-code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="text-center text-xl tracking-widest font-mono h-12"
                  placeholder="• • • • • •"
                  autoComplete="one-time-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-new-password">Parolă nouă</Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caractere"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setResetStep("email")}
                >
                  ← Înapoi
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={resetLoading || resetCode.length !== 6}
                >
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Salvați
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
