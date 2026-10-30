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

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
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
