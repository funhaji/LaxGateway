"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PRICE_PER_GB_IRR,
  MIN_GB,
  MAX_GB,
  formatIrr,
} from "@/lib/pricing";
import styles from "./purchase.module.css";

const GB_PRESETS = [1, 2, 5, 10, 20, 50];

type Step = "form" | "pay" | "loading";

interface OrderResponse {
  paymentUrlBot: string;
  paymentUrlWeb: string;
  amount: number;
  gb: number;
  authority: string;
}

export default function PurchaseForm() {
  const [gb, setGb] = useState(5);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderResponse | null>(null);

  const amount = useMemo(() => gb * PRICE_PER_GB_IRR, [gb]);

  const submit = useCallback(async () => {
    setError("");
    const m = mobile.replace(/\D/g, "");
    if (m.length < 10) {
      setError("شماره موبایل معتبر وارد کنید");
      return;
    }
    const normalized = m.startsWith("0") ? m : `0${m}`;

    setStep("loading");
    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gb,
          mobile: normalized,
          email: email.trim() || "customer@web.local",
          channel: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      setOrder(data);
      setStep("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
      setStep("form");
    }
  }, [gb, mobile, email]);

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <label className={styles.label}>حجم (گیگابایت)</label>
            <motion.output
              className={styles.gbDisplay}
              key={gb}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {gb} <span>GB</span>
            </motion.output>

            <input
              type="range"
              min={MIN_GB}
              max={MAX_GB}
              value={gb}
              onChange={(e) => setGb(Number(e.target.value))}
              className={styles.slider}
            />

            <motion.div
              className={styles.presets}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              {GB_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.preset} ${gb === n ? styles.presetActive : ""}`}
                  onClick={() => setGb(n)}
                >
                  {n} GB
                </button>
              ))}
            </motion.div>

            <p className={styles.priceLine}>
              مبلغ: <strong>{formatIrr(amount)}</strong>
              <span className={styles.muted}>
                {" "}
                (هر GB = {formatIrr(PRICE_PER_GB_IRR)})
              </span>
            </p>

            <label className={styles.label}>شماره موبایل</label>
            <input
              className={styles.input}
              type="tel"
              placeholder="09123456789"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              dir="ltr"
            />

            <label className={styles.label}>ایمیل (اختیاری)</label>
            <input
              className={styles.input}
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />

            {error && <p className={styles.error}>{error}</p>}

            <motion.button
              type="button"
              className={styles.btnPrimary}
              onClick={submit}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ادامه به پرداخت
            </motion.button>
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div
            key="loading"
            className={styles.loading}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.spinner} />
            <p>در حال ایجاد سفارش…</p>
          </motion.div>
        )}

        {step === "pay" && order && (
          <motion.div
            key="pay"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className={styles.successBadge}>سفارش آماده پرداخت است</p>
            <p className={styles.priceLine}>
              {order.gb} GB — <strong>{formatIrr(order.amount)}</strong>
            </p>
            <p className={`${styles.muted} ${styles.small}`}>
              روش پرداخت را انتخاب کنید:
            </p>

            <div className={styles.payButtons}>
              <motion.a
                href={order.paymentUrlWeb}
                className={styles.btnPrimary}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🌐 پرداخت در وب
              </motion.a>
              <motion.a
                href={order.paymentUrlBot}
                className={styles.btnSecondary}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🤖 پرداخت در تلگرام
              </motion.a>
            </div>

            <button
              type="button"
              className={styles.btnLink}
              onClick={() => setStep("form")}
            >
              ← بازگشت
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
