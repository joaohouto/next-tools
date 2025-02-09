"use client";

import React, { useEffect, useState } from "react";

interface SvgStringProps {
  svgString: string;
  size: number | string;
  fill?: string; // Parâmetro para definir o valor do fill
  style?: React.CSSProperties;
}

const CustomSvgFromString: React.FC<SvgStringProps> = ({
  svgString,
  size,
  fill = "black", // Default para "black" caso não seja passado
  style,
}) => {
  const [validatedSvg, setValidatedSvg] = useState<string>("");

  useEffect(() => {
    // Validação simples para garantir que a string contenha uma tag <svg>
    const svgRegex = /<svg[^>]*>/;
    if (!svgRegex.test(svgString)) {
      setValidatedSvg("");
      return;
    }

    // Substituir ou adicionar os atributos desejados no SVG
    let updatedSvg = svgString;

    // Substituir o valor de width e height, se existirem
    updatedSvg = updatedSvg.replace(/(width="[^"]*")/, `width="${size}"`);
    updatedSvg = updatedSvg.replace(/(height="[^"]*")/, `height="${size}"`);

    // Se não houver atributos width ou height, adicione-os
    if (!updatedSvg.includes('width="')) {
      updatedSvg = updatedSvg.replace("<svg", `<svg width="${size}"`);
    }
    if (!updatedSvg.includes('height="')) {
      updatedSvg = updatedSvg.replace("<svg", `<svg height="${size}"`);
    }

    // Substituir todos os valores de 'fill' já existentes
    updatedSvg = updatedSvg.replace(/fill="[^"]*"/g, `fill="${fill}"`);

    setValidatedSvg(updatedSvg);
  }, [svgString, size, fill]); // Agora 'fill' também é uma dependência

  if (validatedSvg) {
    return (
      <div style={style} dangerouslySetInnerHTML={{ __html: validatedSvg }} />
    );
  }

  return <p className="font-mono text-sm">SVG inválido!</p>;
};

export default CustomSvgFromString;
