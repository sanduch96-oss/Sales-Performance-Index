import { useState } from "react";
import { Link } from "wouter";
import { 
  useListSpecialists, 
  useCreateSpecialist, 
  useArchiveSpecialist, 
  useDeleteSpecialist,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Archive, Trash2, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/language-context";
import { LocalizedDatePicker } from "@/components/ui/localized-date-picker";

export default function Specialists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: activeSpecialists, isLoading: isLoadingActive } = useListSpecialists({ archived: false });
  const { data: archivedSpecialists, isLoading: isLoadingArchived } = useListSpecialists({ archived: true });

  const createSpecialist = useCreateSpecialist();
  const archiveSpecialist = useArchiveSpecialist();
  const deleteSpecialist = useDeleteSpecialist();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    position: "",
    department: "",
    hireDate: new Date().toISOString().split("T")[0],
    manager: "",
    status: "active" as "active" | "inactive",
    monthlyTarget: "",
  });

  const invalidateSpecialists = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/specialists"] });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const mt = formData.monthlyTarget ? parseInt(formData.monthlyTarget) : undefined;
    const dataToSend = { ...formData, manager: formData.manager || undefined, monthlyTarget: mt };
    createSpecialist.mutate({ data: dataToSend }, {
      onSuccess: () => {
        toast({ title: t.specialists.add });
        setIsAddDialogOpen(false);
        invalidateSpecialists();
        setFormData({ firstName: "", lastName: "", position: "", department: "", hireDate: new Date().toISOString().split("T")[0], manager: "", status: "active", monthlyTarget: "" });
      },
      onError: () => toast({ variant: "destructive", title: t.common.save }),
    });
  };

  const handleArchive = (id: number, archived: boolean) => {
    archiveSpecialist.mutate({ id, data: { archived } }, {
      onSuccess: () => {
        toast({ title: archived ? t.specialists.archived : t.specialists.active });
        invalidateSpecialists();
      },
      onError: () => toast({ variant: "destructive", title: t.common.save }),
    });
  };

  const handleDelete = (id: number) => {
    deleteSpecialist.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t.common.delete });
        invalidateSpecialists();
      },
      onError: () => toast({ variant: "destructive", title: t.common.save }),
    });
  };

  const archivedCount = archivedSpecialists?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t.specialists.title}</h2>
          <p className="text-muted-foreground">{t.specialists.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" className="relative">
                <Archive className="mr-2 h-4 w-4" /> {t.specialists.archiveBtn}
                {archivedCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold w-5 h-5">
                    {archivedCount}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>{t.specialists.archiveBtn} ({archivedCount})</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 overflow-y-auto">
                {isLoadingArchived ? (
                  <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : archivedSpecialists?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t.specialists.noSpecialists}</p>
                ) : (
                  <div className="divide-y divide-border border rounded-lg overflow-hidden">
                    {archivedSpecialists?.map(spec => (
                      <div key={spec.id} className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-sm">{spec.firstName} {spec.lastName}</p>
                            <p className="text-xs text-muted-foreground">{spec.position} • {spec.department}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">{t.specialists.archived}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/specialists/${spec.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" /> {t.specialists.profile}
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" onClick={() => handleArchive(spec.id, false)}>
                            {t.specialists.active}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.specialists.archiveConfirm}</AlertDialogTitle>
                                <AlertDialogDescription>{t.specialists.archiveDesc}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(spec.id)} className="bg-destructive text-destructive-foreground">{t.common.delete}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> {t.specialists.add}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.specialists.addTitle}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.specialists.firstName}</Label>
                    <Input id="firstName" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.specialists.lastName}</Label>
                    <Input id="lastName" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">{t.specialists.position}</Label>
                  <Input id="position" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t.specialists.department}</Label>
                  <Input id="department" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">{t.profile.date}</Label>
                  <LocalizedDatePicker value={formData.hireDate} onChange={v => setFormData({ ...formData, hireDate: v })} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager">Manager</Label>
                  <Input id="manager" value={formData.manager} onChange={e => setFormData({ ...formData, manager: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.specialists.status}</Label>
                  <Select value={formData.status} onValueChange={(v: "active" | "inactive") => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.specialists.active}</SelectItem>
                      <SelectItem value="inactive">{t.specialists.archived}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyTarget">{t.specialists.monthlyTarget}</Label>
                  <Input id="monthlyTarget" type="number" min={0} value={formData.monthlyTarget} onChange={e => setFormData({ ...formData, monthlyTarget: e.target.value })} placeholder="ex: 20" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t.common.cancel}</Button>
                  <Button type="submit" disabled={createSpecialist.isPending}>
                    {createSpecialist.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t.common.save}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoadingActive ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : activeSpecialists?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border rounded-lg">
          <p>{t.specialists.noSpecialists}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>{t.specialists.name}</span>
            <span>{t.specialists.position} / {t.specialists.department}</span>
            <span>{t.specialists.spiScore}</span>
            <span>{t.specialists.evals}</span>
            <span>{t.specialists.status}</span>
            <span></span>
          </div>
          <div className="divide-y divide-border">
            {activeSpecialists?.map(spec => (
              <div key={spec.id} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="font-medium">{spec.firstName} {spec.lastName}</div>
                <div className="text-sm text-muted-foreground">
                  <span>{spec.position}</span>
                  <span className="mx-1">•</span>
                  <span>{spec.department}</span>
                </div>
                <div className="font-bold text-primary">
                  {spec.spiScore !== null ? `${spec.spiScore}/100` : <span className="text-muted-foreground font-normal">{t.common.na}</span>}
                </div>
                <div className="text-sm">{spec.evaluationCount}</div>
                <div>
                  <Badge variant={spec.status === "active" ? "default" : "secondary"}>
                    {spec.status === "active" ? t.specialists.active : t.specialists.archived}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Link href={`/specialists/${spec.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" /> {t.specialists.profile}
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => handleArchive(spec.id, true)} title={t.specialists.archiveBtn}>
                    <Archive className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" title={t.common.delete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.specialists.archiveConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>{t.specialists.archiveDesc}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(spec.id)} className="bg-destructive text-destructive-foreground">{t.common.delete}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
