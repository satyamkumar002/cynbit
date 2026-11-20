import type { Metadata } from "next";
import { BlueprintWizard } from "./BlueprintWizard";

export const metadata: Metadata = {
  title: "Project Blueprint",
  description: "Get an instant estimate, an AI-written project brief and book a discovery call with Cynbit in about two minutes.",
};

export default async function StartPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="eyebrow">Project Blueprint</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Plan your project in about two minutes</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Five quick steps. You get a price and timeline range, a written project brief and a discovery-call slot. No email back-and-forth.
      </p>
      <div className="mt-8">
        <BlueprintWizard initialService={service} />
      </div>
    </div>
  );
}
