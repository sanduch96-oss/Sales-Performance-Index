import { useState } from "react";
import { 
  useListCriteriaSections, 
  useUpdateCriteriaSection,
  useUpdateCriterion,
  getListCriteriaSectionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: sections, isLoading } = useListCriteriaSections();
  const updateSection = useUpdateCriteriaSection();
  const updateCriterion = useUpdateCriterion();

  const [editingSections, setEditingSections] = useState<Record<number, string>>({});
  const [editingCriteria, setEditingCriteria] = useState<Record<number, { name: string, weight: number }>>({});

  const handleSectionNameChange = (id: number, name: string) => {
    setEditingSections(prev => ({ ...prev, [id]: name }));
  };

  const handleCriterionChange = (id: number, field: 'name' | 'weight', value: string | number) => {
    setEditingCriteria(prev => {
      const current = prev[id] || { 
        name: sections?.find(s => s.criteria.find(c => c.id === id))?.criteria.find(c => c.id === id)?.name || "", 
        weight: sections?.find(s => s.criteria.find(c => c.id === id))?.criteria.find(c => c.id === id)?.weight || 0
      };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const saveSection = (id: number) => {
    if (!editingSections[id]) return;
    updateSection.mutate({ id, data: { name: editingSections[id] } }, {
      onSuccess: () => {
        toast({ title: "Secțiune actualizată" });
        queryClient.invalidateQueries({ queryKey: getListCriteriaSectionsQueryKey() });
        setEditingSections(prev => { const n = {...prev}; delete n[id]; return n; });
      }
    });
  };

  const saveCriterion = (id: number) => {
    if (!editingCriteria[id]) return;
    updateCriterion.mutate({ id, data: editingCriteria[id] }, {
      onSuccess: () => {
        toast({ title: "Criteriu actualizat" });
        queryClient.invalidateQueries({ queryKey: getListCriteriaSectionsQueryKey() });
        setEditingCriteria(prev => { const n = {...prev}; delete n[id]; return n; });
      }
    });
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Setări</h2>
        <p className="text-muted-foreground">Configurați structura și ponderile criteriilor de evaluare.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criterii de evaluare</CardTitle>
          <CardDescription>Modificați denumirile și ponderile. Punctajul maxim total este influențat de aceste ponderi.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={sections?.map(s => s.id.toString())} className="space-y-4">
            {sections?.map(section => (
              <AccordionItem key={section.id} value={section.id.toString()} className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex justify-between w-full pr-4">
                    <span className="font-semibold">{section.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">Pondere totală secțiune: {section.totalWeight} pct</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-end gap-4 max-w-md">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Redenumire secțiune</label>
                        <Input 
                          defaultValue={section.name} 
                          onChange={(e) => handleSectionNameChange(section.id, e.target.value)} 
                        />
                      </div>
                      {editingSections[section.id] && editingSections[section.id] !== section.name && (
                        <Button size="sm" onClick={() => saveSection(section.id)} disabled={updateSection.isPending}>
                          <Save className="h-4 w-4 mr-2" /> Salvează
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Criterii</h4>
                    {section.criteria.map(crit => {
                      const isEditing = editingCriteria[crit.id] !== undefined;
                      const hasChanges = isEditing && (editingCriteria[crit.id].name !== crit.name || editingCriteria[crit.id].weight !== crit.weight);
                      
                      return (
                        <div key={crit.id} className="flex flex-col sm:flex-row gap-4 items-end bg-muted/20 p-3 rounded border">
                          <div className="flex-1 space-y-1 w-full">
                            <label className="text-xs text-muted-foreground">Nume criteriu</label>
                            <Input 
                              value={isEditing ? editingCriteria[crit.id].name : crit.name}
                              onChange={(e) => handleCriterionChange(crit.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className="w-full sm:w-32 space-y-1">
                            <label className="text-xs text-muted-foreground">Pondere (pct)</label>
                            <Input 
                              type="number" 
                              min="0"
                              value={isEditing ? editingCriteria[crit.id].weight : crit.weight}
                              onChange={(e) => handleCriterionChange(crit.id, 'weight', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          {hasChanges ? (
                            <Button size="icon" onClick={() => saveCriterion(crit.id)} disabled={updateCriterion.isPending}>
                              <Save className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="w-9 h-9"></div> // placeholder to keep alignment
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
