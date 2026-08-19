"use client";

import React, { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AppWindow,
  ArrowUpRight,
  Calendar,
  Copy,
  Edit,
  MessageSquare,
  Plus,
  Settings,
  X,
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
  const [templates, setTemplates] = useLocalStorage<Template[]>("zaplink-templates", []);
  const [phone, setPhone] = useLocalStorage<string>("zaplink-phone", "");
  const [message, setMessage] = useLocalStorage<string>("zaplink-message", "");
  const [variableValues, setVariableValues] = useLocalStorage<{ [key: string]: string }>("zaplink-variables", {});
  const [phoneSettings, setPhoneSettings] = useLocalStorage<PhoneSettings>("zaplink-phone-settings", {
    autoAddDDD: false,
    defaultDDD: "11",
    autoAddCountryCode: true,
  });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPhoneSettings, setShowPhoneSettings] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  const messageRef = useRef<HTMLTextAreaElement>(null);
  const templateContentRef = useRef<HTMLTextAreaElement>(null);

  const cleanPhone = (phoneNumber: string): string => {
    let cleaned = phoneNumber.replace(/\D/g, "");
    if (phoneSettings.autoAddDDD && cleaned.length === 9) cleaned = phoneSettings.defaultDDD + cleaned;
    if (phoneSettings.autoAddCountryCode && cleaned.length > 0 && !cleaned.startsWith("55"))
      cleaned = "55" + cleaned;
    return cleaned;
  };

  const SYSTEM_VARIABLES: Record<string, () => string> = {
    date: () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    },
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\$\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.slice(2, -1)))].filter(
      (v) => !(v in SYSTEM_VARIABLES)
    );
  };

  const replaceVariables = (content: string): string => {
    let result = content;
    Object.entries(SYSTEM_VARIABLES).forEach(([key, getValue]) => {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), getValue());
    });
    Object.entries(variableValues).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
    });
    return result;
  };

  const finalMessage = useMemo(() => replaceVariables(message), [message, variableValues]);

  const generateWhatsAppLink = (): string => {
    const cleanedPhone = cleanPhone(phone);
    if (!cleanedPhone) return "";
    return `https://web.whatsapp.com/send/?phone=${cleanedPhone}&text=${encodeURIComponent(finalMessage)}&type=phone_number&app_absent=0`;
  };

  const copyToClipboard = () => {
    if (generateWhatsAppLink()) {
      navigator.clipboard.writeText(finalMessage);
      toast.success("Mensagem copiada!");
    }
  };

  const openWhatsApp = () => {
    const link = generateWhatsAppLink();
    if (link) window.open(link, "_blank");
  };

  const openTemplateModal = (template?: Template) => {
    setEditingTemplate(template ?? null);
    setNewTemplateName(template?.name ?? "");
    setNewTemplateContent(template?.content ?? "");
    setShowTemplateModal(true);
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
    if (editingTemplate) {
      setTemplates(templates.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, name: newTemplateName.trim(), content: newTemplateContent.trim() }
          : t
      ));
    } else {
      setTemplates([...templates, { id: Date.now().toString(), name: newTemplateName.trim(), content: newTemplateContent.trim() }]);
    }
    setNewTemplateName("");
    setNewTemplateContent("");
    setEditingTemplate(null);
    setShowTemplateModal(false);
  };

  const removeTemplate = (id: string) => setTemplates(templates.filter((t) => t.id !== id));

  const useTemplate = (template: Template) => {
    const variables = extractVariables(template.content);
    const newValues: { [key: string]: string } = {};
    variables.forEach((v) => { newValues[v] = variableValues[v] || ""; });
    setVariableValues(variables.length > 0 ? newValues : {});
    setMessage(template.content);
  };

  const handleVariableChange = (variable: string, value: string) =>
    setVariableValues((prev) => ({ ...prev, [variable]: value }));

  const insertAtCursor = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    value: string,
    setValue: (value: string) => void,
    token: string
  ) => {
    const el = ref.current;
    if (!el) {
      setValue(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const currentVariables = extractVariables(message);
  const whatsappLink = generateWhatsAppLink();
  const todayExample = SYSTEM_VARIABLES.date();

  useHotkeys("ctrl+enter", () => {
    whatsappLink ? openWhatsApp() : toast.error("Por favor, insira um número de telefone válido.");
  }, { preventDefault: true, enableOnFormTags: true, enableOnContentEditable: true }, [whatsappLink]);

  useHotkeys("ctrl+shift+n", () => openTemplateModal(), { preventDefault: true });
  useHotkeys("ctrl+shift+s", () => setShowPhoneSettings(true), { preventDefault: true });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AppWindow className="size-6 text-primary" />
            ZapLink
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Abra conversas no WhatsApp sem precisar salvar o número na agenda.
          </p>
        </div>

        {/* Templates */}
        <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Templates
              </span>
              {templates.length > 0 && (
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] font-normal">
                  {templates.length}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => openTemplateModal()}>
              <Plus className="size-3.5" />
              Novo
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-muted-foreground">
              <MessageSquare className="size-8 opacity-20" />
              <p className="text-sm">Nenhum template ainda.</p>
              <p className="text-xs opacity-70 text-center max-w-xs">
                Crie modelos reutilizáveis com campos dinâmicos, como <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{"${nome}"}</code>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[26rem] overflow-y-auto pr-0.5">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group rounded-xl border bg-background p-3 hover:border-foreground/20 transition-colors flex flex-col"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm flex-1 truncate">{template.name}</p>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openTemplateModal(template)} className="p-1 hover:bg-muted rounded-md" title="Editar template">
                        <Edit className="size-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => removeTemplate(template.id)} className="p-1 hover:bg-destructive/10 rounded-md" title="Excluir template">
                        <X className="size-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{template.content}</p>
                  <Button size="sm" variant="secondary" className="w-full h-7 text-xs" onClick={() => useTemplate(template)}>
                    Usar template
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">

          {/* Left column */}
          <div className="flex flex-col gap-4">

            {/* Message */}
            <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Mensagem
              </span>
              <Textarea
                ref={messageRef}
                placeholder="Digite sua mensagem ou use um template..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[220px] font-mono text-sm resize-none bg-background"
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <span>
                  Use <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{"${variável}"}</code> para criar campos dinâmicos
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => insertAtCursor(messageRef, message, setMessage, "${date}")}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 hover:border-foreground/30 hover:text-foreground transition-colors"
                    >
                      <Calendar className="size-3" />
                      {"${date}"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[230px] text-xs">
                    Variável do sistema: preenchida automaticamente com a data de hoje ({todayExample}). Clique para inserir no cursor.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Phone */}
            <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Número
                </span>
                <button
                  onClick={() => setShowPhoneSettings(true)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  title="Configurações de formatação"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                </button>
              </div>

              <Input
                type="text"
                placeholder="Ex: 11999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-base h-11 bg-background"
              />

              {phone && (
                <p className="text-xs text-muted-foreground">
                  Formatado: <span className="font-mono">+{cleanPhone(phone)}</span>
                </p>
              )}

              <Button onClick={openWhatsApp} disabled={!whatsappLink} className="w-full">
                Abrir WhatsApp
                <ArrowUpRight className="size-4" />
              </Button>
            </div>

            {/* Variables */}
            {currentVariables.length > 0 && (
              <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Variáveis
                </span>
                {currentVariables.map((variable) => (
                  <div key={variable} className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">{variable}</Label>
                    <Input
                      placeholder={`Valor para ${variable}`}
                      value={variableValues[variable] || ""}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      className="bg-background"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {message.trim() && (
          <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Prévia
              </span>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="size-3.5" />
                Copiar
              </Button>
            </div>
            <div className="rounded-xl bg-background border p-3">
              <p className="text-sm whitespace-pre-wrap">{finalMessage}</p>
            </div>
          </div>
        )}

        {/* Shortcuts */}
        <p className="text-[11px] text-muted-foreground/70 text-center">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> abrir WhatsApp · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd> novo template · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> configurações de número
        </p>
      </div>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Nome</Label>
              <Input
                placeholder="Ex: Mensagem de apresentação"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Conteúdo</Label>
              <Textarea
                ref={templateContentRef}
                placeholder={`Digite a mensagem...\n\nUse \${variável} para campos dinâmicos.\nEx: Olá, \${nome}! Hoje é \${date}.`}
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm resize-none"
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <span>
                  <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{"${nome}"}</code> vira um campo preenchível
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => insertAtCursor(templateContentRef, newTemplateContent, setNewTemplateContent, "${date}")}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 hover:border-foreground/30 hover:text-foreground transition-colors"
                    >
                      <Calendar className="size-3" />
                      {"${date}"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[230px] text-xs">
                    Variável do sistema: preenchida automaticamente com a data de hoje ({todayExample}), sem pedir preenchimento. Clique para inserir no cursor.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Cancelar</Button>
            <Button onClick={saveTemplate} disabled={!newTemplateName.trim() || !newTemplateContent.trim()}>
              {editingTemplate ? "Salvar Alterações" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Settings Modal */}
      <Dialog open={showPhoneSettings} onOpenChange={setShowPhoneSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações de Formatação</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label>Adicionar código do país (+55)</Label>
                <p className="text-xs text-muted-foreground">Adiciona automaticamente o código do Brasil</p>
              </div>
              <Switch
                checked={phoneSettings.autoAddCountryCode}
                onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, autoAddCountryCode: checked })}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label>Adicionar DDD padrão</Label>
                  <p className="text-xs text-muted-foreground">Para números com apenas 9 dígitos</p>
                </div>
                <Switch
                  checked={phoneSettings.autoAddDDD}
                  onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, autoAddDDD: checked })}
                />
              </div>

              {phoneSettings.autoAddDDD && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">DDD padrão</Label>
                  <Input
                    type="text"
                    placeholder="11"
                    maxLength={2}
                    value={phoneSettings.defaultDDD}
                    onChange={(e) => setPhoneSettings({ ...phoneSettings, defaultDDD: e.target.value.replace(/\D/g, "") })}
                    className="w-24"
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
