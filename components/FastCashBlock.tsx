"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function FastCashBlock() {
  const { dict } = useI18n();

  return (
    <div className="container section">
      <div className="fastcash-block">
        <div>
          <h2>{dict.block.title}</h2>
          <p className="muted">{dict.block.text}</p>
        </div>
        <Link href="/estimation" className="btn btn-gold">{dict.block.cta}</Link>
      </div>
    </div>
  );
}
