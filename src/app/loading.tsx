import { Spinner } from "@/components/spinner";

export default function Loading() {
  return (
    <div className="min-w-screen min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
}
