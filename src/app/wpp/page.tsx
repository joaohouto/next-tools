"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, ExternalLink, Plus, X } from 'lucide-react';

export default function WhatsAppLinkGenerator() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);

  React.useEffect(() => {
    const savedTemplates = localStorage.getItem('whatsapp-templates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Erro ao carregar templates:', e);
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('whatsapp-templates', JSON.stringify(templates));
  }, [templates]);

  const cleanPhone = (phoneNumber) => {
    // Remove tudo que não é número
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Se não começar com 55, adiciona (código do Brasil)
    if (cleaned.length > 0 && !cleaned.startsWith('55')) {
      return '55' + cleaned;
    }
    
    return cleaned;
  };

  const generateWhatsAppLink = () => {
    const cleanedPhone = cleanPhone(phone);
    if (!cleanedPhone) return '';
    
    const encodedMessage = encodeURIComponent(message);
    return `https://web.whatsapp.com/send/?phone=${cleanedPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
  };

  const copyToClipboard = () => {
    const link = generateWhatsAppLink();
    if (link) {
      navigator.clipboard.writeText(link);
    }
  };

  const openWhatsApp = () => {
    const link = generateWhatsAppLink();
    if (link) {
      window.open(link, '_blank');
    }
  };

  const addTemplate = () => {
    if (newTemplate.trim()) {
      setTemplates([...templates, newTemplate.trim()]);
      setNewTemplate('');
      setShowTemplateInput(false);
    }
  };

  const removeTemplate = (index) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const useTemplate = (template) => {
    setMessage(template);
  };

  const whatsappLink = generateWhatsAppLink();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-lg font-bold text-center mb-8">WhatsApp</h1>
        
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <Input
                type="text"
                placeholder="Digite o número (ex: 11999999999)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg h-12"
              />
              {phone && (
                <p className="text-sm text-muted-foreground mt-2">
                  Número formatado: +{cleanPhone(phone)}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Mensagem (opcional)
              </label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-muted-foreground">
                  Templates
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateInput(!showTemplateInput)}
                >
                  <Plus />
                  Adicionar
                </Button>
              </div>

              {showTemplateInput && (
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Novo template..."
                    value={newTemplate}
                    onChange={(e) => setNewTemplate(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTemplate()}
                  />
                  <Button onClick={addTemplate} size="sm">OK</Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {templates.map((template, index) => (
                  <div
                    key={index}
                    className="group relative inline-flex items-center"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => useTemplate(template)}
                      className="pr-8"
                    >
                      {template}
                    </Button>
                    <button
                      onClick={() => removeTemplate(index)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-300 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {whatsappLink && (
              <div className="pt-4 border-t space-y-3">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Link gerado:</p>
                  <p className="text-sm break-all">{whatsappLink}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={openWhatsApp}
                    className="flex-1"
                  >
                    <ExternalLink />
                    Abrir WhatsApp
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
