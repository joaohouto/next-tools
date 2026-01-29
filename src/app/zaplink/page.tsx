"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  ExternalLink,
  Plus,
  X,
  Edit,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface Template {
  id: string;
  name: string;
  content: string;
}

interface PhoneSettings {
  autoAddDDD: boolean;
  defaultDDD: string;
  autoAddCountryCode: boolean;
}

export default function ZapLink() {
  // Usar o hook useLocalStorage para todos os estados que precisam persistência
  const [templates, setTemplates] = useLocalStorage<Template[]>(
    "zaplink-templates",
    [],
  );
  const [phone, setPhone] = useLocalStorage<string>("zaplink-phone", "");
  const [message, setMessage] = useLocalStorage<string>("zaplink-message", "");
  const [variableValues, setVariableValues] = useLocalStorage<{
    [key: string]: string;
  }>("zaplink-variables", {});
  const [phoneSettings, setPhoneSettings] = useLocalStorage<PhoneSettings>(
    "zaplink-phone-settings",
    {
      autoAddDDD: false,
      defaultDDD: "11",
      autoAddCountryCode: true,
    },
  );

  // Estados que não precisam de persistência
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showPhoneSettings, setShowPhoneSettings] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateContent, setNewTemplateContent] = useState<string>("");

  const cleanPhone = (phoneNumber: string): string => {
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Auto adicionar DDD se configurado
    if (phoneSettings.autoAddDDD && cleaned.length === 9) {
      cleaned = phoneSettings.defaultDDD + cleaned;
    }

    // Auto adicionar código do país se configurado
    if (
      phoneSettings.autoAddCountryCode &&
      cleaned.length > 0 &&
      !cleaned.startsWith("55")
    ) {
      cleaned = "55" + cleaned;
    }

    return cleaned;
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\$\{([^}]+)\}/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(2, -1)))];
  };

  const replaceVariables = (content: string): string => {
    let result = content;
    Object.entries(variableValues).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
    });
    return result;
  };

  const finalMessage = useMemo(
    () => replaceVariables(message),
    [message, variableValues],
  );

  const generateWhatsAppLink = (): string => {
    const cleanedPhone = cleanPhone(phone);
    if (!cleanedPhone) return "";
    const encodedMessage = encodeURIComponent(finalMessage);
    return `https://web.whatsapp.com/send/?phone=${cleanedPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
  };

  const copyToClipboard = (): void => {
    const link = generateWhatsAppLink();
    if (link) {
      navigator.clipboard.writeText(finalMessage);
      toast.success("Mensagem copiada para a área de transferência!");
    }
  };

  const openWhatsApp = (): void => {
    const link = generateWhatsAppLink();
    if (link) {
      window.open(link, "_blank");
    }
  };

  const openTemplateModal = (template?: Template): void => {
    if (template) {
      setEditingTemplate(template);
      setNewTemplateName(template.name);
      setNewTemplateContent(template.content);
    } else {
      setEditingTemplate(null);
      setNewTemplateName("");
      setNewTemplateContent("");
    }
    setShowTemplateModal(true);
  };

  const saveTemplate = (): void => {
    if (newTemplateName.trim() && newTemplateContent.trim()) {
      if (editingTemplate) {
        setTemplates(
          templates.map((t) =>
            t.id === editingTemplate.id
              ? {
                  ...t,
                  name: newTemplateName.trim(),
                  content: newTemplateContent.trim(),
                }
              : t,
          ),
        );
      } else {
        const newTemplate: Template = {
          id: Date.now().toString(),
          name: newTemplateName.trim(),
          content: newTemplateContent.trim(),
        };
        setTemplates([...templates, newTemplate]);
      }
      setNewTemplateName("");
      setNewTemplateContent("");
      setEditingTemplate(null);
      setShowTemplateModal(false);
    }
  };

  const removeTemplate = (id: string): void => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const useTemplate = (template: Template): void => {
    const variables = extractVariables(template.content);
    if (variables.length > 0) {
      const newValues: { [key: string]: string } = {};
      variables.forEach((v) => {
        newValues[v] = variableValues[v] || "";
      });
      setVariableValues(newValues);
    } else {
      setVariableValues({});
    }
    setMessage(template.content);
  };

  const handleVariableChange = (variable: string, value: string): void => {
    setVariableValues((prev) => ({ ...prev, [variable]: value }));
  };

  const currentVariables = extractVariables(message);
  const whatsappLink = generateWhatsAppLink();

  useHotkeys(
    "ctrl+enter",
    () => {
      if (whatsappLink) {
        openWhatsApp();
      } else {
        toast.error("Por favor, insira um número de telefone válido.");
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [whatsappLink],
  );

  useHotkeys(
    "ctrl+shift+n",
    () => {
      openTemplateModal();
    },
    {
      preventDefault: true,
    },
  );

  useHotkeys(
    "ctrl+shift+s",
    () => {
      setShowPhoneSettings(true);
    },
    {
      preventDefault: true,
    },
  );

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold mb-2">ZapLink</h1>
          <p className="text-muted-foreground text-sm">
            Gerador de links WhatsApp com templates
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Templates */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTemplateModal()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Novo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum template salvo ainda.
                    <br />
                    Clique em "Novo" para criar um.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="group border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-sm flex-1">
                            {template.name}
                          </p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openTemplateModal(template)}
                              className="p-1 hover:bg-primary/10 rounded"
                            >
                              <Edit className="w-3.5 h-3.5 text-primary" />
                            </button>
                            <button
                              onClick={() => removeTemplate(template.id)}
                              className="p-1 hover:bg-destructive/10 rounded"
                            >
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {template.content}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={() => useTemplate(template)}
                        >
                          Usar template
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mensagem</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Digite sua mensagem ou use um template..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[250px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Use ${"{"}variável{"}"} para criar campos dinâmicos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Configuração e Envio */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Número</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPhoneSettings(true)}
                  >
                    <Settings />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="text"
                  placeholder="Digite o número (ex: 11999999999)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-lg h-12"
                />
                {phone && (
                  <p className="text-sm text-muted-foreground">
                    Número formatado: +{cleanPhone(phone)}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex">
                {whatsappLink && (
                  <Button onClick={openWhatsApp} className="w-full">
                    Abrir WhatsApp
                    <ArrowUpRight />
                  </Button>
                )}
              </CardFooter>
            </Card>

            {currentVariables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Variáveis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentVariables.map((variable) => (
                    <div key={variable}>
                      <Label className="text-sm mb-2 block">{variable}</Label>
                      <Input
                        placeholder={`Valor para \${${variable}}`}
                        value={variableValues[variable] || ""}
                        onChange={(e) =>
                          handleVariableChange(variable, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {currentVariables.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-between gap-2">
                    <CardTitle className="text-lg">Prévia</CardTitle>

                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="ml-auto"
                    >
                      <Copy />
                      Copiar Mensagem
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {finalMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Template */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Nome do template
              </Label>
              <Input
                placeholder="Ex: Mensagem de apresentação"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Conteúdo</Label>
              <Textarea
                placeholder={`Digite a mensagem...\n\nUse \${variável} para criar campos dinâmicos.\nExemplo: Prezado, \${nome}. A respeito de \${assunto}.`}
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                className="min-h-[250px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Dica: Use ${"{"}nome{"}"}, ${"{"}empresa{"}"}, ${"{"}assunto
                {"}"} etc. para criar variáveis
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveTemplate}
              disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
            >
              {editingTemplate ? "Salvar Alterações" : "Salvar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurações do Telefone */}
      <Dialog open={showPhoneSettings} onOpenChange={setShowPhoneSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Formatação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label>Adicionar código do país (+55)</Label>
                <p className="text-xs text-muted-foreground">
                  Adiciona automaticamente o código do Brasil
                </p>
              </div>
              <Switch
                checked={phoneSettings.autoAddCountryCode}
                onCheckedChange={(checked) =>
                  setPhoneSettings({
                    ...phoneSettings,
                    autoAddCountryCode: checked,
                  })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label>Adicionar DDD padrão</Label>
                  <p className="text-xs text-muted-foreground">
                    Para números com apenas 9 dígitos
                  </p>
                </div>
                <Switch
                  checked={phoneSettings.autoAddDDD}
                  onCheckedChange={(checked) =>
                    setPhoneSettings({
                      ...phoneSettings,
                      autoAddDDD: checked,
                    })
                  }
                />
              </div>

              {phoneSettings.autoAddDDD && (
                <div>
                  <Label className="text-sm mb-2 block">DDD padrão</Label>
                  <Input
                    type="text"
                    placeholder="11"
                    maxLength={2}
                    value={phoneSettings.defaultDDD}
                    onChange={(e) =>
                      setPhoneSettings({
                        ...phoneSettings,
                        defaultDDD: e.target.value.replace(/\D/g, ""),
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPhoneSettings(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
