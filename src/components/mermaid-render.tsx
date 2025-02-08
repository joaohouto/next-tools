import mermaid from "mermaid";
import { useEffect } from "react";

mermaid.initialize({});

const Mermaid = ({
  chart,
  id,
  ref,
}: {
  chart: string;
  id: string;
  ref?: any;
}) => {
  useEffect(() => {
    document.getElementById(id)?.removeAttribute("data-processed");
    mermaid.contentLoaded();
  }, [chart, id]);

  return (
    <div className="mermaid" id={id} ref={ref}>
      {chart}
    </div>
  );
};

export default Mermaid;
