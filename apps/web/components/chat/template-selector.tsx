"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Loader2, ChevronRight, X, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
}

interface TemplateSelectorProps {
  connectionId: string;
  onSelect: (template: Template, variables: Record<string, string>) => void;
  onCancel: () => void;
}

export function TemplateSelector({ connectionId, onSelect, onCancel }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [connectionId]);

  async function fetchTemplates() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ templates: Template[] }>(`/connections/${connectionId}/templates`);
      setTemplates(response.data.templates || []);
    } catch (error: any) {
      console.error("Failed to fetch templates:", error);
      setError(error.message || "Falha ao carregar templates");
    } finally {
      setIsLoading(false);
    }
  }

  // Extract variables from template text ({{1}}, {{2}}, etc.)
  function extractVariables(template: Template): string[] {
    const vars: string[] = [];
    const regex = /\{\{(\d+)\}\}/g;
    
    for (const component of template.components) {
      if (component.text) {
        let match;
        while ((match = regex.exec(component.text)) !== null) {
          if (!vars.includes(match[1])) {
            vars.push(match[1]);
          }
        }
      }
    }
    
    return vars.sort((a, b) => parseInt(a) - parseInt(b));
  }

  // Get preview text with variables replaced
  function getPreviewText(template: Template): string {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return "";
    
    let text = bodyComponent.text;
    const templateVars = extractVariables(template);
    
    for (const v of templateVars) {
      const value = variables[v] || `{{${v}}}`;
      text = text.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), value);
    }
    
    return text;
  }

  // Get header text
  function getHeaderText(template: Template): string | null {
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    if (!headerComponent?.text) return null;
    return headerComponent.text;
  }

  // Get category color
  function getCategoryColor(category: string): string {
    switch (category?.toUpperCase()) {
      case 'MARKETING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'UTILITY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'AUTHENTICATION':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }

  // Filter templates by search
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'OUTROS';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  function handleSelectTemplate(template: Template) {
    setSelectedTemplate(template);
    // Initialize variables with empty values
    const vars = extractVariables(template);
    const initialVars: Record<string, string> = {};
    for (const v of vars) {
      initialVars[v] = "";
    }
    setVariables(initialVars);
  }

  function handleSendTemplate() {
    if (!selectedTemplate) return;
    onSelect(selectedTemplate, variables);
  }

  // Check if all required variables are filled
  const templateVars = selectedTemplate ? extractVariables(selectedTemplate) : [];
  const allVariablesFilled = templateVars.every(v => variables[v]?.trim());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchTemplates} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Template detail view
  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
            ← Voltar
          </Button>
          <Badge className={getCategoryColor(selectedTemplate.category)}>
            {selectedTemplate.category}
          </Badge>
        </div>

        <div>
          <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
          <p className="text-xs text-muted-foreground">Idioma: {selectedTemplate.language}</p>
        </div>

        {/* Preview */}
        <div className="bg-muted/50 rounded-lg p-4 border">
          <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
          {getHeaderText(selectedTemplate) && (
            <p className="font-medium mb-2">{getHeaderText(selectedTemplate)}</p>
          )}
          <p className="text-sm whitespace-pre-wrap">{getPreviewText(selectedTemplate)}</p>
        </div>

        {/* Variables form */}
        {templateVars.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Preencha as variáveis:</p>
            {templateVars.map((v) => (
              <div key={v} className="space-y-1">
                <Label htmlFor={`var-${v}`} className="text-xs">
                  Variável {`{{${v}}}`}
                </Label>
                <Input
                  id={`var-${v}`}
                  placeholder={`Valor para {{${v}}}`}
                  value={variables[v] || ""}
                  onChange={(e) => setVariables({ ...variables, [v]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSendTemplate} 
            disabled={templateVars.length > 0 && !allVariablesFilled}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Template
          </Button>
        </div>
      </div>
    );
  }

  // Template list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Selecione um Template</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum template encontrado</p>
          <p className="text-xs mt-1">
            Cadastre templates no Meta Business Manager
          </p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum template corresponde à busca</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {category}
                </p>
                <div className="space-y-1">
                  {categoryTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={cn(
                        "w-full p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors",
                        "flex items-center justify-between gap-2"
                      )}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {template.components.find(c => c.type === 'BODY')?.text?.substring(0, 60)}...
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="pt-2 border-t">
        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancelar
        </Button>
      </div>
    </div>
  );
}

