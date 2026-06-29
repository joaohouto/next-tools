"use client";

import React, { useEffect, useState } from "react";

interface SvgStringProps {
  svgString: string;
  size: number | string;
  fill?: string;
  style?: React.CSSProperties;
}

const CustomSvgFromString: React.FC<SvgStringProps> = ({
  svgString,
  size,
  fill = "black",
  style,
}) => {
  const [validatedSvg, setValidatedSvg] = useState<string>("");

  useEffect(() => {
    const svgRegex = /<svg[^>]*>/;
    if (!svgRegex.test(svgString)) {
      setValidatedSvg("");
      return;
    }

    let updatedSvg = svgString;

    updatedSvg = updatedSvg.replace(/(width="[^"]*")/, `width="${size}"`);
    updatedSvg = updatedSvg.replace(/(height="[^"]*")/, `height="${size}"`);

    if (!updatedSvg.includes('width="')) {
      updatedSvg = updatedSvg.replace("<svg", `<svg width="${size}"`);
    }
    if (!updatedSvg.includes('height="')) {
      updatedSvg = updatedSvg.replace("<svg", `<svg height="${size}"`);
    }

    updatedSvg = updatedSvg.replace(/fill="[^"]*"/g, `fill="${fill}"`);

    setValidatedSvg(updatedSvg);
  }, [svgString, size, fill]);

  if (validatedSvg) {
    return (
      <div style={style} dangerouslySetInnerHTML={{ __html: validatedSvg }} />
    );
  }

  return <p className="font-mono text-sm">SVG inválido!</p>;
};

export default CustomSvgFromString;
