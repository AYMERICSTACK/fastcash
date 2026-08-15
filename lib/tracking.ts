export function getTrackingUrl(carrier?: string | null, trackingNo?: string | null) {
  if (!trackingNo) return null;

  const code = encodeURIComponent(trackingNo.trim());
  const normalized = (carrier || "").toLowerCase();

  if (normalized.includes("poste suisse") || normalized.includes("swiss post")) {
    return `https://service.post.ch/EasyTrack/submitParcelData.do?formattedParcelCodes=${code}`;
  }
  if (normalized.includes("dhl")) {
    return `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${code}`;
  }
  if (normalized.includes("ups")) {
    return `https://www.ups.com/track?loc=fr_CH&tracknum=${code}`;
  }
  if (normalized.includes("colissimo") || normalized.includes("la poste")) {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${code}`;
  }
  if (normalized.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
  }

  return null;
}
