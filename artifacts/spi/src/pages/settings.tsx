import { useState } from "react";
import {
  useListCriteriaSections,
  useCreateCriteriaSection,
  useUpdateCriteriaSection,
  useDeleteCriteriaSection,
  useCreateCriterion,
  useUpdateCriterion,
  useDeleteCriterion,
  getListCriteriaSectionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, type Language } from "@/contexts/language-context";
import { Loader2, Plus, Save, Trash2, Globe, ClipboardList, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LANG_OPTIONS: { code: Language; label: string }[] = [
  { code: "ro", label: "Română" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();

  const [openPanel, setOpenPanel] = useState<"language" | "criteria" | null>(null);

  const { data: sections, isLoading } = useListCriteriaSections();
  const createSection = useCreateCriteriaSection();
  const updateSection = useUpdateCriteriaSection();
  const deleteSection = useDeleteCriteriaSection();
  const createCriterion = useCreateCriterion();
  const updateCriterion = useUpdateCriterion();
  const deleteCriterion = useDeleteCriterion();

  const [newSectionName, setNewSectionName] = useState("");
  const [editingSections, setEditingSections] = useState<Record<number, string>>({});
  const [editingCriteria, setEditingCriteria] = useState<Record<number, { name: string; weight: number }>>({});
  const [newCriteria, setNewCriteria] = useState<Record<number, { name: string; weight: string }>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCriteriaSectionsQueryKey() });

  const togglePanel = (panel: "language" | "criteria") =>
    setOpenPanel(prev => (prev === panel ? null : panel));

  const handleAddSection = async () => {
    const name = newSectionName.trim();
    if (!name) return;
    try {
      await createSection.mutateAsync({ data: { name } });
      setNewSectionName("");
      await invalidate();
      toast({ title: "Compartiment adăugat" });
    } catch {
      toast({ variant: "destructive", title: "Eroare la adăugare" });
    }
  };

  const handleSaveSection = async (id: number) => {
    const name = editingSections[id]?.trim();
    if (!name) return;
    try {
      await updateSection.mutateAsync({ id, data: { name } });
      setEditingSections(prev => { const n = { ...prev }; delete n[id]; return n; });
      await invalidate();
      toast({ title: "Compartiment actualizat" });
    } catch {
      toast({ variant: "destructive", title: "Eroare la salvare" });
    }
  };

  const handleDeleteSection = async (id: number) => {
    try {
      await deleteSection.mutateAsync({ id });
      await invalidate();
      toast({ title: "Compartiment șters" });
    } catch {
      toast({ variant: "destructive", title: "Eroare la ștergere" });
    }
  };

  const handleAddCriterion = async (sectionId: number) => {
    const entry = newCriteria[sectionId];
    if (!entry?.name?.trim() || !entry.weight) return;
    const weight = parseFloat(entry.weight);
    if (isNaN(weight) || weight <= 0) {
      toast({ variant: "destructive", title: "Pontajul trebuie să fie un număr pozitiv" });
      return;
    }
    try {
      await createCriterion.mutateAsync({ data: { sectionId, name: entry.name.trim(), weight } });
      setNewCriteria(prev => { const n = { ...prev }; delete n[sectionId]; return n; });
      await invalidate();
      toast({ title: "Criteriu adăugat" });
    } catch {
      toast({ variant: "destructive", title: "Eroare la adăugare" });
    }
  };

  const handleSaveCriterion = async (id: number) => {
    const entry = editingCriteria[id];
    if (!entry) return;
    try {
      await updateCriterion.mutateAsync({ id, data: { name: entry.name, weight: entry.weight } });
      setEditingCriteria(prev => { const n = { ...prev }; delete n[id]; return n; });
      await invalidate();
      toast({ title: "Criteriu actualizat" });
    } catch {
      toast({ variant: "destructive", title: "Eroare la salvare" });
    }
  };

  const handleDeleteCriterion = async (id: number) => {
    try {
      await deleteCriterion.mutateAsync({ id });
      await invalidate();
      toast({ title: "Criteriu șters" });
    } catch {
      toast({ variant: "destructive", title: "Eroare la ștergere" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t.settings.title}</h2>
        <p className="text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <div className="space-y-3">
        {/* ── Language panel ── */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <button
            onClick={() => togglePanel("language")}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-base">{t.settings.language}</p>
                <p className="text-sm text-muted-foreground">{t.settings.languageDesc}</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0",
                openPanel === "language" && "rotate-180"
              )}
            />
          </button>

          {openPanel === "language" && (
            <div className="px-5 pb-5 pt-2 border-t bg-muted/10">
              <div className="flex flex-wrap gap-3 pt-3">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => setLanguage(opt.code)}
                    className={cn(
                      "px-6 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                      language === opt.code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Criteria panel ── */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <button
            onClick={() => togglePanel("criteria")}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-base">{t.settings.criteria}</p>
                <p className="text-sm text-muted-foreground">{t.settings.criteriaDesc}</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0",
                openPanel === "criteria" && "rotate-180"
              )}
            />
          </button>

          {openPanel === "criteria" && (
            <div className="px-5 pb-5 pt-2 border-t bg-muted/10">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-5 pt-3">
                  {/* Add new section */}
                  <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t.settings.sectionName}</Label>
                      <Input
                        value={newSectionName}
                        onChange={e => setNewSectionName(e.target.value)}
                        placeholder={t.settings.sectionName}
                        onKeyDown={e => e.key === "Enter" && handleAddSection()}
                      />
                    </div>
                    <Button onClick={handleAddSection} disabled={!newSectionName.trim() || createSection.isPending}>
                      <Plus className="h-4 w-4 mr-2" /> {t.settings.addSection}
                    </Button>
                  </div>

                  {/* Sections accordion */}
                  <Accordion type="multiple" defaultValue={sections?.map(s => s.id.toString())} className="space-y-3">
                    {sections?.map(section => (
                      <AccordionItem key={section.id} value={section.id.toString()} className="border rounded-lg bg-card">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex justify-between w-full pr-4 items-center">
                            <span className="font-semibold">{section.name}</span>
                            <span className="text-sm font-normal text-muted-foreground">
                              {t.settings.totalWeight}: {section.totalWeight} pct
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-3 border-t">
                          {/* Section rename + delete */}
                          <div className="flex items-end gap-3 mb-5">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs text-muted-foreground">{t.settings.rename}</Label>
                              <Input
                                defaultValue={section.name}
                                onChange={e => setEditingSections(prev => ({ ...prev, [section.id]: e.target.value }))}
                              />
                            </div>
                            {editingSections[section.id] !== undefined && editingSections[section.id] !== section.name && (
                              <Button size="sm" onClick={() => handleSaveSection(section.id)} disabled={updateSection.isPending}>
                                <Save className="h-4 w-4 mr-1" /> {t.common.save}
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                  <Trash2 className="h-4 w-4 mr-1" /> {t.settings.deleteSection}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.settings.deleteSection}</AlertDialogTitle>
                                  <AlertDialogDescription>{t.settings.deleteSectionDesc}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteSection(section.id)}>
                                    {t.common.delete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {/* Existing criteria */}
                          <div className="space-y-2 mb-4">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Criterii ({section.criteria.length})
                            </h4>
                            {section.criteria.map(crit => {
                              const isEditing = editingCriteria[crit.id] !== undefined;
                              const current = isEditing ? editingCriteria[crit.id] : { name: crit.name, weight: crit.weight };
                              const hasChanges = isEditing && (current.name !== crit.name || current.weight !== crit.weight);

                              return (
                                <div key={crit.id} className="flex flex-col sm:flex-row gap-2 items-end bg-muted/20 p-3 rounded-lg border">
                                  <div className="flex-1 space-y-1 w-full">
                                    <Label className="text-xs text-muted-foreground">{t.settings.criterionName}</Label>
                                    <Input
                                      value={current.name}
                                      onChange={e => setEditingCriteria(prev => ({
                                        ...prev,
                                        [crit.id]: { name: e.target.value, weight: prev[crit.id]?.weight ?? crit.weight }
                                      }))}
                                    />
                                  </div>
                                  <div className="w-full sm:w-28 space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t.settings.weight} (pct)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={current.weight}
                                      onChange={e => setEditingCriteria(prev => ({
                                        ...prev,
                                        [crit.id]: { name: prev[crit.id]?.name ?? crit.name, weight: parseFloat(e.target.value) || 0 }
                                      }))}
                                    />
                                  </div>
                                  <div className="flex gap-1.5">
                                    {hasChanges && (
                                      <Button size="icon" onClick={() => handleSaveCriterion(crit.id)} disabled={updateCriterion.isPending} title={t.common.save}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="icon" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" title={t.common.delete}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>{t.settings.deleteCriterion}</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Criteriul <strong>{crit.name}</strong> va fi șters definitiv.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteCriterion(crit.id)}>
                                            {t.common.delete}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              );
                            })}

                            {section.criteria.length === 0 && (
                              <p className="text-sm text-muted-foreground py-2 text-center">Nu există criterii în acest compartiment.</p>
                            )}
                          </div>

                          {/* Add new criterion */}
                          <div className="flex flex-col sm:flex-row gap-2 items-end p-3 bg-primary/5 border border-dashed border-primary/30 rounded-lg">
                            <div className="flex-1 space-y-1 w-full">
                              <Label className="text-xs text-muted-foreground">{t.settings.criterionName}</Label>
                              <Input
                                value={newCriteria[section.id]?.name || ""}
                                onChange={e => setNewCriteria(prev => ({
                                  ...prev,
                                  [section.id]: { ...prev[section.id], name: e.target.value }
                                }))}
                                placeholder={t.settings.criterionName}
                              />
                            </div>
                            <div className="w-full sm:w-28 space-y-1">
                              <Label className="text-xs text-muted-foreground">{t.settings.weight} (pct)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={newCriteria[section.id]?.weight || ""}
                                onChange={e => setNewCriteria(prev => ({
                                  ...prev,
                                  [section.id]: { ...prev[section.id], weight: e.target.value }
                                }))}
                                placeholder="0"
                              />
                            </div>
                            <Button
                              onClick={() => handleAddCriterion(section.id)}
                              disabled={!newCriteria[section.id]?.name?.trim() || !newCriteria[section.id]?.weight || createCriterion.isPending}
                              size="sm"
                              className="whitespace-nowrap"
                            >
                              <Plus className="h-4 w-4 mr-1" /> {t.settings.addCriterion}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {sections?.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">{t.common.noData}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
