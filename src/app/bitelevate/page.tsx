import type { Metadata } from "next";
import Link from "next/link";
import { PathFinder } from "./PathFinder";

export const metadata: Metadata = {
  title: "BitElevate Path Finder",
  description: "Answer three questions and get matched to the right BitElevate lab, then apply in one step.",
};

const FACTS = [
  ["60 days", "remote sprint"],
  ["1.5–2 h", "a day, no live calls"],
  ["Daily PRs", "reviewed by mentors"],
  ["₹1,499", "one-time fee"],
];

export default function BitElevatePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">BitElevate · Path Finder</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Find the lab that fits you in under a minute</h1>
        <p className="mt-3 text-muted">
          Three questions, six labs. You&apos;ll see your match, why it fits, and can apply straight away.{" "}
          <Link href="/bitelevate/status" className="text-accent hover:underline">Already applied?</Link>
        </p>
        <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {FACTS.map(([v, l]) => (
            <div key={l} className="card px-3 py-4">
              <dt className="text-lg font-bold">{v}</dt>
              <dd className="text-xs text-muted">{l}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-10">
        <PathFinder />
      </div>
    </div>
  );
}
