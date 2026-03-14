"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe, BookOpen, Briefcase, Calendar, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Currículo",
};

const education = [
  {
    period: "2025 – presente",
    degree: "Bacharelado em Ciência da Computação",
    institution: "Centro Universitário União das Américas Descomplica (Uniamérica)",
    ongoing: true,
  },
  {
    period: "2023 – presente",
    degree: "Bacharelado em Direito",
    institution: "Universidade Estadual de Mato Grosso do Sul (UEMS) – Aquidauana",
    ongoing: true,
  },
  {
    period: "2018 – 2021",
    degree: "Ensino Médio com Técnico em Informática",
    institution: "Instituto Federal de Mato Grosso do Sul (IFMS) – Campus Aquidauana",
    ongoing: false,
  },
  {
    period: "2009 – 2017",
    degree: "Ensino Fundamental",
    institution: "Escola Particular Irene Cicalise (EPIC)",
    ongoing: false,
  },
];

const experience = [
  {
    period: "2025 – 2026",
    role: "Estagiário",
    org: "Ministério Público Estadual (MPE)",
    type: "Bolsista",
    hours: "5h semanais",
  },
  {
    period: "2025",
    role: "Monitor de Disciplina",
    org: "Universidade Estadual de Mato Grosso do Sul (UEMS)",
    type: "Bolsista",
    detail: "Direito Civil – Obrigações e Contratos",
    hours: "4h semanais",
  },
];

const events = [
  {
    year: "2025",
    title: "III Congresso Jurídico do Curso de Direito da UEMS Aquidauana",
    role: "Organizador",
    authors: "Silva, R.G.S.C.; Couto, J.H.M.; Costa, A.S.",
    type: "Congresso",
  },
  {
    year: "2024",
    title: "I Encontro Científico do Curso de Direito da UEMS Aquidauana",
    role: "Participante",
    paper: "ESG vs. Greenwashing: uma análise da verdadeira cor da sustentabilidade empresarial e seus impactos no consumo",
    type: "Congresso",
  },
  {
    year: "2022",
    title: "20ª Feira Brasileira de Ciências e Engenharia",
    role: "Participante",
    paper: "E-Bov: um app progressivo para escrituração zootécnica informatizada de rebanhos pecuários",
    type: "Feira",
  },
  {
    year: "2021",
    title: "FECIAQ",
    role: "Participante",
    paper: "E-Bov: um app progressivo para escrituração zootécnica informatizada de rebanhos pecuários",
    type: "Feira",
  },
  {
    year: "2019",
    title: "FECIAQ",
    role: "Participante",
    paper: "Comportamento bovino e fatores ambientais: um método de associação estatística pela utilização de sensores e inteligência artificial",
    type: "Feira",
  },
];

export default function CVPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            João Henrique Martins Couto
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Acadêmico em Direito e Ciência da Computação. Técnico em Informática pelo IFMS.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <a
              href="https://lattes.cnpq.br/2945910960238369"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <BookOpen size={12} />
              Lattes
              <ExternalLink size={10} />
            </a>
            <a
              href="https://orcid.org/0009-0000-8264-2557"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <Globe size={12} />
              ORCID
              <ExternalLink size={10} />
            </a>
            <span className="inline-flex items-center gap-1">
              <span>País: Brasil</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Citações: COUTO, J. H. M. · Atualizado em 28/02/2026
          </p>
        </div>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Education */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
            <BookOpen size={13} />
            Formação Acadêmica
          </h2>
          <div className="space-y-4">
            {education.map((item, i) => (
              <div key={i} className="grid grid-cols-[7rem_1fr] gap-4 items-start">
                <span className="text-xs text-neutral-400 dark:text-neutral-500 pt-0.5 tabular-nums">
                  {item.period}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.degree}</span>
                    {item.ongoing && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                        em andamento
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.institution}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Experience */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
            <Briefcase size={13} />
            Atuação Profissional
          </h2>
          <div className="space-y-4">
            {experience.map((item, i) => (
              <div key={i} className="grid grid-cols-[7rem_1fr] gap-4 items-start">
                <span className="text-xs text-neutral-400 dark:text-neutral-500 pt-0.5 tabular-nums">
                  {item.period}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.role}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.org}</p>
                  {item.detail && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{item.detail}</p>
                  )}
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">{item.hours}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Languages */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
            <Globe size={13} />
            Idiomas
          </h2>
          <div className="flex gap-6">
            {[
              { lang: "Português", level: "Nativo" },
              { lang: "Inglês", level: "Avançado" },
            ].map((item, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-sm font-medium">{item.lang}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.level}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Events */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
            <Award size={13} />
            Eventos
          </h2>
          <div className="space-y-4">
            {events.map((item, i) => (
              <div key={i} className="grid grid-cols-[7rem_1fr] gap-4 items-start">
                <span className="text-xs text-neutral-400 dark:text-neutral-500 pt-0.5 tabular-nums">
                  {item.year}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{item.role}</p>
                  {item.paper && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{item.paper}</p>
                  )}
                  {item.authors && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{item.authors}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-neutral-200 dark:border-neutral-800" />

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-600 pb-4">
          <Calendar size={12} />
          <span>Última atualização: 28/02/2026</span>
        </div>

      </div>
    </div>
  );
}
