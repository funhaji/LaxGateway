"use client";

import { motion } from "framer-motion";
import { formatIrr } from "@/lib/pricing";
import styles from "./success.module.css";

interface Props {
  gb: string;
  amount: string;
  tracking: string;
}

export default function SuccessBanner({ gb, amount, tracking }: Props) {
  const amountNum = Number(amount);
  return (
    <motion.div
      className={styles.banner}
      initial={{ opacity: 0, scale: 0.95, y: -12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <motion.div className={styles.icon}>✓</motion.div>
      <h2>پرداخت موفق</h2>
      <p>
        <strong>{gb} GB</strong>
        {amountNum > 0 && <> — {formatIrr(amountNum)}</>}
      </p>
      <p className={styles.track}>
        کد پیگیری: <code>{tracking}</code>
      </p>
      <p className={styles.note}>
        کانفیگ V2Ray به زودی برای شما ارسال می‌شود. در صورت خرید از تلگرام، رسید در
        ربات نیز ارسال شده است.
      </p>
    </motion.div>
  );
}
