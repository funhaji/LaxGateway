import PurchaseForm from "./components/PurchaseForm";
import SuccessBanner from "./components/SuccessBanner";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const payment = typeof params.payment === "string" ? params.payment : "";

  return (
    <main className="page">
      <header className="hero">
        <h1>خرید کانفیگ V2Ray</h1>
        <p>هر ۱ گیگابایت — ۲۰۰٬۰۰۰ ریال · پرداخت امن TetraPay</p>
      </header>

      {payment === "success" && (
        <SuccessBanner
          gb={String(params.gb ?? "")}
          amount={String(params.amount ?? "")}
          tracking={String(params.tracking ?? "")}
        />
      )}
      {payment === "failed" && (
        <div className="banner-failed">پرداخت ناموفق بود. دوباره تلاش کنید.</div>
      )}

      <PurchaseForm />

      <footer className="footer">
        <p>
          ربات تلگرام: پس از دیپلوی،{" "}
          <code>/api/telegram/setup</code> را یک‌بار باز کنید
        </p>
      </footer>
    </main>
  );
}
