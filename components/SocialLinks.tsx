"use client";

import { useShopSettings } from "@/components/settings/ShopSettingsProvider";

type SocialLinksProps = {
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
  onNavigate?: () => void;
};

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="17.4" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export default function SocialLinks({
  className = "",
  compact = false,
  showLabels = false,
  onNavigate,
}: SocialLinksProps) {
  const instagramUrl = useShopSettings().instagramUrl?.trim();

  if (!instagramUrl) return null;

  const linkClassName = compact ? "social-link social-link-compact" : "social-link";

  return (
    <div className={`social-links ${className}`.trim()} aria-label="Réseaux sociaux FAST CASH Genève">
      {instagramUrl ? (
        <a
          href={instagramUrl}
          className={linkClassName}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="FAST CASH Genève sur Instagram"
          title="Instagram"
          onClick={onNavigate}
        >
          <InstagramIcon size={20} />
          {showLabels ? <span>Instagram</span> : null}
        </a>
      ) : null}
    </div>
  );
}
