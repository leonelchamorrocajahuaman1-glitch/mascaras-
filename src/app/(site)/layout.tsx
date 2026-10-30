import { SmoothScroll } from "@/components/experience/SmoothScroll";
import { Cursor } from "@/components/experience/Cursor";
import { Header } from "@/components/experience/Header";
import { Footer } from "@/components/experience/Footer";
import { Preloader } from "@/components/experience/Preloader";
import { RouteTransitionProvider } from "@/components/experience/RouteTransition";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { StoreSettingsProvider } from "@/lib/store/settings";
import { toPublicSettings } from "@/lib/public-settings";
import { db } from "@/lib/db";
import { syncPublicModels } from "@/lib/models";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Registra (y asigna según models.json) los modelos nuevos de public/models. Cacheado: no repite trabajo.
  await syncPublicModels().catch((err) => console.error("No se pudieron sincronizar los modelos 3D:", err));
  const settings = toPublicSettings(await db().getSettings());
  return (
    <StoreSettingsProvider value={settings}>
    <RouteTransitionProvider>
      <div className="grain">
        <SmoothScroll />
        <Preloader />
        <Cursor />
        <Header />
        <CartDrawer />
        <main id="main">{children}</main>
        <Footer />
      </div>
    </RouteTransitionProvider>
    </StoreSettingsProvider>
  );
}
