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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Archive, Trash2, Eye, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Specialists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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
    hireDate: new Date().toISOString().split('T')[0],
    manager: "",
    status: "active" as "active" | "inactive"
  });

  const invalidateSpecialists = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/specialists"] });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      manager: formData.manager || undefined,
    };
    createSpecialist.mutate({ data: dataToSend }, {
      onSuccess: () => {
        toast({ title: "Specialist adăugat cu succes" });
        setIsAddDialogOpen(false);
        invalidateSpecialists();
        setFormData({ firstName: "", lastName: "", position: "", department: "", hireDate: new Date().toISOString().split('T')[0], manager: "", status: "active" });
      },
      onError: () => toast({ variant: "destructive", title: "Eroare la adăugare. Verificați câmpurile completate." })
    });
  };

  const handleArchive = (id: number, archived: boolean) => {
    archiveSpecialist.mutate({ id, data: { archived } }, {
      onSuccess: () => {
        toast({ title: archived ? "Specialist arhivat" : "Specialist dezarhivat" });
        invalidateSpecialists();
      },
      onError: () => toast({ variant: "destructive", title: "Eroare la arhivare" })
    });
  };

  const handleDelete = (id: number) => {
    deleteSpecialist.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Specialist șters definitiv" });
        invalidateSpecialists();
      },
      onError: () => toast({ variant: "destructive", title: "Eroare la ștergere" })
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Specialiști</h2>
          <p className="text-muted-foreground">Gestionați specialiștii și vizualizați performanța lor.</p>
        </div>
        <div className="flex gap-2">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline"><Archive className="mr-2 h-4 w-4" /> Arhivă</Button>
            </DrawerTrigger>
            <DrawerContent className="h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>Specialiști arhivați</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 overflow-y-auto space-y-4">
                {isLoadingArchived ? (
                  <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : archivedSpecialists?.length === 0 ? (
                  <p className="text-center text-muted-foreground">Nu există specialiști arhivați.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {archivedSpecialists?.map(spec => (
                      <Card key={spec.id} className="opacity-75">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{spec.firstName} {spec.lastName}</CardTitle>
                          <CardDescription>{spec.position}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                          <Badge variant="secondary">Arhivat</Badge>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleArchive(spec.id, false)}>Dezarhivează</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ștergeți definitiv?</AlertDialogTitle>
                                  <AlertDialogDescription>Această acțiune nu poate fi anulată.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Anulare</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(spec.id)} className="bg-destructive text-destructive-foreground">Șterge</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Adaugă specialist</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adaugă specialist nou</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenume</Label>
                    <Input id="firstName" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nume</Label>
                    <Input id="lastName" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Funcție</Label>
                  <Input id="position" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departament</Label>
                  <Input id="department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Data angajării</Label>
                  <Input type="date" id="hireDate" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager">Manager (opțional)</Label>
                  <Input id="manager" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v: "active" | "inactive") => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activ</SelectItem>
                      <SelectItem value="inactive">Inactiv</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Anulare</Button>
                  <Button type="submit" disabled={createSpecialist.isPending}>
                    {createSpecialist.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvează
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
        <Card className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <p>Nu aveți niciun specialist activ.</p>
        </Card>
      ) : (
        <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
          {activeSpecialists?.map(spec => (
            <Card key={spec.id} className="min-w-[300px] max-w-[350px] snap-center flex-shrink-0 flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{spec.firstName} {spec.lastName}</CardTitle>
                    <CardDescription>{spec.position}</CardDescription>
                  </div>
                  <Badge variant={spec.status === "active" ? "default" : "secondary"}>
                    {spec.status === "active" ? "Activ" : "Inactiv"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid grid-cols-2 gap-4 my-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Scor SPI</p>
                    <p className="text-2xl font-bold">{spec.spiScore !== null ? `${spec.spiScore}/100` : "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Evaluări</p>
                    <p className="text-2xl font-bold">{spec.evaluationCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border">
                  <Link href={`/specialists/${spec.id}`} className="flex-1">
                    <Button variant="default" className="w-full" size="sm">
                      <Eye className="mr-2 h-4 w-4" /> Profil
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => handleArchive(spec.id, true)}>
                    <Archive className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ștergeți definitiv?</AlertDialogTitle>
                        <AlertDialogDescription>Această acțiune va șterge și toate evaluările asociate.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anulare</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(spec.id)} className="bg-destructive text-destructive-foreground">Șterge</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
