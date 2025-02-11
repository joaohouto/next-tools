"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { motion } from "framer-motion";

import axios from "axios";
import React, { useState } from "react";
import { Link, Loader, Sparkles } from "lucide-react";

const itemVariants = {
  hidden: { y: 20, opacity: 0, filter: "blur(6px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0)",
    transition: {
      duration: 0.4,
      delay: index * 0.2,
    },
  }),
};

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");

  const [domains, setDomains] = useState([]);

  const generateDomains = async () => {
    setLoading(true);

    try {
      const response = await axios.post("/api/domain-generation", {
        prompt,
      });

      setDomains(response.data.domains);
    } catch (err) {
      console.log(err);
      toast.error("Erro ao gerar domínios!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen bg-center bg-[radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:bg-[radial-gradient(theme(colors.neutral.800)_1px,transparent_1px)] bg-[size:20px_20px]">
      <div className="max-w-[500px] min-h-screen mx-auto p-8 gap-8 flex flex-col items-center justify-center">
        <motion.div
          layout
          transition={{
            type: "spring",
            visualDuration: 0.2,
            bounce: 0.2,
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-medium">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Link className="size-4" />
                </div>
                Gerador de Domínios
              </CardTitle>
              <CardDescription>
                Gerar sugestões de domínios .BR para seu app com ajuda da
                Inteligência Artificial da OpenAI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name">Descreva o seu projeto</Label>
                  <Textarea
                    placeholder="Um site com várias ferramentas para desenvolvedores..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={generateDomains}
                disabled={loading}
              >
                {loading ? <Loader className="animate-spin" /> : <Sparkles />}
                Gerar domínios
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-2 items-center justify-center"
        >
          {domains?.map((domain, index) => (
            <motion.div variants={itemVariants} custom={index}>
              <Button
                key={domain}
                variant="outline"
                className="fit-content"
                asChild
              >
                <a
                  href={`https://registro.br/busca-dominio?fqdn=${domain}`}
                  target="_blank"
                >
                  {domain}
                </a>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
