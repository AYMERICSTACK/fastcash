import type { Invoice, Order, OrderItem, Customer, Address, Payment } from "@prisma/client";
import { legalConfig } from "@/lib/legal-config";

type InvoiceWithRelations = Invoice & {
  order: Order & {
    customer: Customer & { addresses: Address[] };
    items: OrderItem[];
    payment: Payment | null;
  };
};

function cleanPdfText(value: string | number | null | undefined) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[()\\]/g, "").replace(/[\r\n]+/g, " ").slice(0, 110);
}
function text(value: string | number | null | undefined, x: number, y: number, size = 10, bold = false, color = "0.08 0.08 0.08") {
  return `BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${cleanPdfText(value)}) Tj ET`;
}
function rect(x:number,y:number,w:number,h:number,fill:string,stroke?:string){ return `${fill} rg ${stroke ?? fill} RG ${x} ${y} ${w} ${h} re B`; }
function line(x1:number,y1:number,x2:number,y2:number,color="0.88 0.82 0.65"){ return `${color} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`; }
function formatMoney(amount: number, currency = "CHF") { return `${amount.toFixed(2)} ${currency}`; }
function paymentLabel(status?: string | null) {
  const labels: Record<string,string> = { paid:"Paye", refunded:"Rembourse", partially_refunded:"Partiellement rembourse", pending:"En attente", failed:"Echoue" };
  return status ? labels[status] ?? status : "Confirme";
}
function buildPdf(content: string) {
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`,
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
  ];
  let body = "%PDF-1.4\n"; const offsets=[0];
  for(const object of objects){ offsets.push(Buffer.byteLength(body,"utf8")); body += `${object}\n`; }
  const xrefOffset=Buffer.byteLength(body,"utf8"); body += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1)) body += `${String(offset).padStart(10,"0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Buffer.from(body,"utf8"));
}

export function generateInvoicePdf(invoice: InvoiceWithRelations) {
  const { order } = invoice; const customer=order.customer; const address=customer.addresses[0];
  const customerName=[customer.firstName,customer.lastName].filter(Boolean).join(" ") || customer.email;
  const c:string[]=[]; const gold="0.84 0.65 0.12", dark="0.04 0.04 0.04", muted="0.38 0.38 0.38";
  c.push(rect(0,722,595,120,dark));
  c.push(text("FAST CASH",42,790,23,true,"1 1 1")); c.push(text("GENEVE",42,770,10,true,gold));
  c.push(text("ACHAT  -  VENTE  -  EXPERTISE PREMIUM",42,747,8,false,"0.78 0.78 0.78"));
  c.push(text("FACTURE",410,792,11,true,gold)); c.push(text(invoice.number,410,768,14,true,"1 1 1"));
  c.push(text(`Commande ${order.orderNumber}`,410,748,8,false,"0.78 0.78 0.78"));

  c.push(text("EMETTEUR",42,690,8,true,gold)); c.push(text(legalConfig.businessName,42,670,12,true));
  c.push(text(legalConfig.address,42,653,8,false,muted)); c.push(text(`${legalConfig.phone}  -  ${legalConfig.email}`,42,638,8,false,muted));
  if(legalConfig.companyId) c.push(text(`IDE / RC : ${legalConfig.companyId}`,42,623,8,false,muted));
  c.push(text("FACTURE A",320,690,8,true,gold)); c.push(text(customerName,320,670,12,true)); c.push(text(customer.email,320,653,8,false,muted));
  if(address){ c.push(text(`${address.line1}${address.line2 ? `, ${address.line2}`:""}`,320,638,8,false,muted)); c.push(text(`${address.postalCode ?? ""} ${address.city}, ${address.country}`,320,623,8,false,muted)); }
  c.push(line(42,600,553,600));
  c.push(text("DATE",42,578,7,true,muted)); c.push(text(invoice.createdAt.toLocaleDateString("fr-CH"),42,560,10,true));
  c.push(text("PAIEMENT",200,578,7,true,muted)); c.push(text(`${order.payment?.provider ?? "Paiement"} - ${paymentLabel(order.payment?.status)}`,200,560,10,true));
  c.push(text("DEVISE",430,578,7,true,muted)); c.push(text(order.currency,430,560,10,true));

  c.push(rect(42,512,511,28,dark)); c.push(text("ARTICLE",54,522,8,true,"1 1 1")); c.push(text("QTE",350,522,8,true,"1 1 1")); c.push(text("PRIX UNIT.",400,522,8,true,"1 1 1")); c.push(text("TOTAL",498,522,8,true,gold));
  let y=486;
  for(const item of order.items){ const total=item.quantity*item.price; c.push(text(item.name,54,y,9,true)); c.push(text(item.quantity,356,y,9)); c.push(text(formatMoney(item.price,order.currency),400,y,9)); c.push(text(formatMoney(total,order.currency),498,y,9,true)); y-=28; c.push(line(42,y+12,553,y+12,"0.9 0.9 0.9")); }
  y-=12;
  c.push(text("Sous-total",350,y,9,false,muted)); c.push(text(formatMoney(invoice.amount,order.currency),475,y,9,true)); y-=24;
  c.push(text("TOTAL",350,y,12,true)); c.push(text(formatMoney(invoice.amount,order.currency),465,y,15,true,gold)); y-=42;
  if(order.payment?.status === "refunded" || (order.payment?.refundedAmount ?? 0) > 0){
    c.push(rect(42,y-18,511,46,"0.97 0.94 0.84",gold)); c.push(text(order.payment?.status === "refunded" ? "PAIEMENT REMBOURSE" : "REMBOURSEMENT PARTIEL",56,y+8,9,true,gold));
    c.push(text(`${formatMoney(order.payment?.refundedAmount ?? 0,order.currency)} rembourse via ${order.payment?.provider ?? "le moyen de paiement"}.`,56,y-8,9,false,muted)); y-=70;
  }
  c.push(line(42,105,553,105)); c.push(text("Merci pour votre confiance.",42,82,10,true));
  c.push(text(`${legalConfig.businessName}  -  ${legalConfig.address}`,42,64,8,false,muted)); c.push(text(`${legalConfig.phone}  -  ${legalConfig.email}`,42,50,8,false,muted));
  return buildPdf(c.join("\n"));
}
