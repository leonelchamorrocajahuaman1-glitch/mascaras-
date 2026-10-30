import { Hero } from "@/components/home/Hero";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <>
      <Hero />
      <div className="h-[100vh]" />
    </>
  );
}
