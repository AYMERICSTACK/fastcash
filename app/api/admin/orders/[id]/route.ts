import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";
import {
  customerOrderReadyForPickupEmail,
  customerOrderShippedEmail,
  customerOrderStatusEmail,
  sendTransactionalEmail,
} from "@/lib/transactional-emails";
import { getTrackingUrl } from "@/lib/tracking";
import { canTransitionOrder, isWorkflowOrderStatus } from "@/lib/order-workflow";
import { heylightFetch, getHeyLightApplicationStatus } from "@/lib/heylight";
import { getStripeClient } from "@/lib/stripe";

function isPickupCarrier(carrier?: string | null) {
  const normalized = (carrier || "").toLowerCase();
  return normalized.includes("retrait") || normalized.includes("pickup");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const action = String(body.action ?? "update");

  try {
    if (action === "stripe_status") {
      const existing = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
      if (!existing?.payment || existing.payment.provider.toLowerCase() !== "stripe" || !existing.payment.reference) {
        return NextResponse.json({ error: "Aucun paiement Stripe associé." }, { status: 400 });
      }

      const stripe = getStripeClient();
      const intent = await stripe.paymentIntents.retrieve(existing.payment.reference, {
        expand: ["latest_charge"],
      });
      const charge = intent.latest_charge && typeof intent.latest_charge !== "string" ? intent.latest_charge : null;
      const refundedAmount = charge ? charge.amount_refunded / 100 : existing.payment.refundedAmount;
      const fullyRefunded = Boolean(charge?.refunded) || refundedAmount >= existing.payment.amount - 0.005;
      const localStatus = fullyRefunded
        ? "refunded"
        : refundedAmount > 0.005
          ? "partially_refunded"
          : intent.status === "succeeded"
            ? "paid"
            : intent.status;
      const previousData = existing.payment.providerData && !Array.isArray(existing.payment.providerData) && typeof existing.payment.providerData === "object"
        ? existing.payment.providerData as Record<string, unknown>
        : {};

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: existing.payment.id },
          data: {
            status: localStatus,
            refundedAmount,
            confirmedAt: intent.status === "succeeded" ? existing.payment.confirmedAt ?? new Date(intent.created * 1000) : existing.payment.confirmedAt,
            providerData: {
              ...previousData,
              paymentIntentId: intent.id,
              chargeId: charge?.id || previousData.chargeId || null,
              stripeStatus: intent.status,
              amountReceived: intent.amount_received / 100,
              amountRefunded: refundedAmount,
              paymentMethodTypes: intent.payment_method_types,
              failureCode: intent.last_payment_error?.code || null,
              failureMessage: intent.last_payment_error?.message || null,
              latestEventType: "admin.payment_intent.retrieve",
              latestEventCreatedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        }),
        ...(fullyRefunded && existing.status !== "REFUNDED"
          ? [prisma.order.update({ where: { id }, data: { status: "REFUNDED" } })]
          : []),
      ]);

      return NextResponse.json({ message: `Statut Stripe actualisé : ${localStatus}.` });
    }

    if (action === "stripe_refund") {
      const existing = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
      if (!existing?.payment || existing.payment.provider.toLowerCase() !== "stripe" || !existing.payment.reference) {
        return NextResponse.json({ error: "Aucun paiement Stripe associé." }, { status: 400 });
      }
      if (!["paid", "partially_refunded"].includes(existing.payment.status)) {
        return NextResponse.json({ error: `Le paiement Stripe n'est pas remboursable dans l'état « ${existing.payment.status} ».` }, { status: 409 });
      }

      const remaining = Math.max(0, existing.payment.amount - existing.payment.refundedAmount);
      const requested = Number(body.amount ?? remaining);
      if (!Number.isFinite(requested) || requested <= 0 || requested > remaining + 0.005) {
        return NextResponse.json({ error: `Montant invalide. Maximum remboursable : ${remaining.toFixed(2)} ${existing.currency}.` }, { status: 400 });
      }

      const stripe = getStripeClient();
      const requestedMinor = Math.round(requested * 100);
      const refundedBeforeMinor = Math.round(existing.payment.refundedAmount * 100);
      const refund = await stripe.refunds.create(
        {
          payment_intent: existing.payment.reference,
          amount: requestedMinor,
          metadata: {
            fastcash_order_id: existing.id,
            fastcash_order_number: existing.orderNumber,
          },
        },
        { idempotencyKey: `fastcash-refund-${existing.payment.id}-${refundedBeforeMinor}-${requestedMinor}` },
      );

      const intent = await stripe.paymentIntents.retrieve(existing.payment.reference, {
        expand: ["latest_charge"],
      });
      const charge = intent.latest_charge && typeof intent.latest_charge !== "string" ? intent.latest_charge : null;
      const refundedAmount = charge
        ? charge.amount_refunded / 100
        : Math.min(existing.payment.amount, existing.payment.refundedAmount + requested);
      const fullyRefunded = Boolean(charge?.refunded) || refundedAmount >= existing.payment.amount - 0.005;
      const previousData = existing.payment.providerData && !Array.isArray(existing.payment.providerData) && typeof existing.payment.providerData === "object"
        ? existing.payment.providerData as Record<string, unknown>
        : {};

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: existing.payment.id },
          data: {
            status: fullyRefunded ? "refunded" : "partially_refunded",
            refundedAmount,
            providerData: {
              ...previousData,
              latestRefundId: refund.id,
              latestRefundStatus: refund.status,
              latestRefundAmount: requested,
              latestEventType: "admin.refund.create",
              latestEventCreatedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        }),
        ...(fullyRefunded && existing.status !== "REFUNDED"
          ? [prisma.order.update({ where: { id }, data: { status: "REFUNDED" } })]
          : []),
      ]);

      return NextResponse.json({
        message: `Remboursement Stripe de ${requested.toFixed(2)} ${existing.currency} créé (${refund.status || "en cours"}).`,
      });
    }

    if (action === "restock_refunded_order") {
      const existing = await prisma.order.findUnique({
        where: { id },
        include: { payment: true, items: true },
      });

      if (!existing?.payment) {
        return NextResponse.json({ error: "Aucun paiement associé à cette commande." }, { status: 400 });
      }

      const fullyRefunded = existing.payment.status === "refunded"
        || existing.payment.refundedAmount >= existing.payment.amount - 0.005;
      if (!fullyRefunded) {
        return NextResponse.json(
          { error: "Le retour en stock n'est disponible qu'après remboursement total de la commande." },
          { status: 409 },
        );
      }

      const productItems = existing.items.filter((item) => item.productId && item.quantity > 0);
      if (!productItems.length || productItems.length !== existing.items.length) {
        return NextResponse.json(
          { error: "Une ou plusieurs lignes de cette commande ne sont pas reliées à un produit. Réintégration automatique impossible." },
          { status: 409 },
        );
      }

      const restockedAt = new Date();
      const restocked = await prisma.$transaction(async (tx) => {
        // Claim atomiquement le droit de réintégrer cette commande. Le second clic
        // ne peut donc jamais incrémenter les stocks une deuxième fois.
        const claimed = await tx.$executeRaw(
          Prisma.sql`
            UPDATE "Payment"
            SET "providerData" = COALESCE("providerData", '{}'::jsonb)
              || jsonb_build_object(
                'stockRestockedAt', ${restockedAt.toISOString()}::text,
                'stockRestockSource', 'admin_return_confirmation'
              )
            WHERE "id" = ${existing.payment!.id}
              AND COALESCE("providerData"->>'stockRestockedAt', '') = ''
          `,
        );

        if (claimed !== 1) return false;

        for (const item of productItems) {
          await tx.product.update({
            where: { id: item.productId! },
            data: { stock: { increment: item.quantity } },
          });
        }

        return true;
      });

      if (!restocked) {
        return NextResponse.json(
          { error: "Le stock de cette commande a déjà été réintégré." },
          { status: 409 },
        );
      }

      return NextResponse.json({
        message: "Retour physique confirmé. Les articles ont été réintégrés au stock.",
        restockedAt: restockedAt.toISOString(),
      });
    }

    if (action === "heylight_status") {
      const existing = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
      if (!existing?.payment || existing.payment.provider !== "HeyLight" || !existing.payment.reference) {
        return NextResponse.json({ error: "Aucun contrat HeyLight associé." }, { status: 400 });
      }
      const providerStatus = await getHeyLightApplicationStatus(existing.payment.reference);
      await prisma.payment.update({ where: { id: existing.payment.id }, data: { providerData: providerStatus as never } });
      return NextResponse.json({ message: "Statut HeyLight actualisé.", providerStatus });
    }

    if (action === "heylight_confirm_delivery") {
      const existing = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
      if (!existing?.payment || existing.payment.provider !== "HeyLight" || !existing.payment.reference) {
        return NextResponse.json({ error: "Aucun contrat HeyLight associé." }, { status: 400 });
      }
      if (!["SHIPPED", "DELIVERED", "READY_FOR_PICKUP"].includes(existing.status)) {
        return NextResponse.json({ error: "La commande doit être expédiée, livrée ou prête au retrait." }, { status: 409 });
      }
      const response = await heylightFetch<unknown>("/api/checkout/v1/confirm/", { method: "POST", body: JSON.stringify({ external_uuid: existing.payment.reference }) });
      await prisma.payment.update({ where: { id: existing.payment.id }, data: { deliveredAt: new Date(), providerData: response as never } });
      return NextResponse.json({ message: "Livraison confirmée auprès de HeyLight." });
    }

    if (action === "heylight_refund") {
      const existing = await prisma.order.findUnique({ where: { id }, include: { payment: true } });
      if (!existing?.payment || existing.payment.provider !== "HeyLight" || !existing.payment.reference) {
        return NextResponse.json({ error: "Aucun contrat HeyLight associé." }, { status: 400 });
      }
      const remaining = Math.max(0, existing.payment.amount - existing.payment.refundedAmount);
      const requested = Number(body.amount || remaining);
      if (!Number.isFinite(requested) || requested <= 0 || requested > remaining) {
        return NextResponse.json({ error: `Montant invalide. Maximum remboursable : ${remaining.toFixed(2)} CHF.` }, { status: 400 });
      }
      const response = await heylightFetch<unknown>("/api/checkout/v1/refund/", { method: "POST", body: JSON.stringify({ external_uuid: existing.payment.reference, amount: requested.toFixed(2), amount_format: "DECIMAL", external_reference: `REF-${existing.orderNumber}-${Date.now()}`, currency: existing.currency || "CHF" }) });
      const refundedAmount = existing.payment.refundedAmount + requested;
      await prisma.$transaction([
        prisma.payment.update({ where: { id: existing.payment.id }, data: { refundedAmount, status: refundedAmount >= existing.payment.amount ? "refunded" : "partially_refunded", providerData: response as never } }),
        ...(refundedAmount >= existing.payment.amount ? [prisma.order.update({ where: { id }, data: { status: "REFUNDED" } })] : []),
      ]);
      return NextResponse.json({ message: `Remboursement HeyLight de ${requested.toFixed(2)} CHF enregistré.` });
    }

    if (action === "mark_shipped") {
      const existing = await prisma.order.findUnique({
        where: { id },
        include: { customer: true, shipment: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      if (isPickupCarrier(existing.shipment?.carrier)) {
        return NextResponse.json(
          { error: "Une commande en retrait boutique ne peut pas être marquée comme expédiée." },
          { status: 400 },
        );
      }

      const carrier = String(body.carrier ?? existing.shipment?.carrier ?? "").trim();
      const trackingNo = String(body.trackingNo ?? existing.shipment?.trackingNo ?? "").trim();

      if (!carrier || !trackingNo) {
        return NextResponse.json(
          { error: "Renseignez le transporteur et le numéro de suivi avant l'expédition." },
          { status: 400 },
        );
      }

      const alreadySent = Boolean(existing.shipment?.shippedEmailSentAt);
      if (!alreadySent && !process.env.RESEND_API_KEY) {
        return NextResponse.json(
          { error: "Le service email n'est pas configuré. La commande n'a pas été modifiée." },
          { status: 503 },
        );
      }

      const shippedAt = existing.shipment?.shippedAt ?? new Date();
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id }, data: { status: "SHIPPED" } });
        await tx.shipment.upsert({
          where: { orderId: id },
          update: { carrier, trackingNo, status: "SHIPPED", shippedAt },
          create: { orderId: id, carrier, trackingNo, status: "SHIPPED", shippedAt },
        });
      });

      if (!alreadySent) {
        const customerName = [existing.customer.firstName, existing.customer.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const trackingUrl = getTrackingUrl(carrier, trackingNo);
        await sendTransactionalEmail({
          to: existing.customer.email,
          subject: `Votre commande ${existing.orderNumber} a été expédiée`,
          html: customerOrderShippedEmail({
            name: customerName || null,
            reference: existing.orderNumber,
            carrier,
            trackingNo,
            trackingUrl,
          }),
        });
        await prisma.shipment.update({
          where: { orderId: id },
          data: { shippedEmailSentAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        alreadySent,
        message: alreadySent
          ? "La commande était déjà expédiée et le client avait déjà été informé."
          : "Commande expédiée et email de suivi envoyé au client.",
      });
    }

    if (action === "ready_for_pickup") {
      const existing = await prisma.order.findUnique({
        where: { id },
        include: { customer: true, shipment: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      if (!isPickupCarrier(existing.shipment?.carrier)) {
        return NextResponse.json(
          { error: "Cette action est réservée aux commandes en retrait boutique." },
          { status: 400 },
        );
      }

      const alreadySent = Boolean(existing.shipment?.readyEmailSentAt);

      if (!alreadySent && !process.env.RESEND_API_KEY) {
        return NextResponse.json(
          { error: "Le service email n'est pas configuré. La commande n'a pas été modifiée." },
          { status: 503 },
        );
      }

      const readyAt = existing.shipment?.readyAt ?? new Date();

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status: "READY_FOR_PICKUP" },
        });

        await tx.shipment.upsert({
          where: { orderId: id },
          update: {
            status: "READY_FOR_PICKUP",
            readyAt,
          },
          create: {
            orderId: id,
            carrier: "Retrait boutique FAST CASH Genève",
            status: "READY_FOR_PICKUP",
            readyAt,
          },
        });
      });

      if (!alreadySent) {
        const customerName = [existing.customer.firstName, existing.customer.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const html = customerOrderReadyForPickupEmail({
          name: customerName || null,
          reference: existing.orderNumber,
        });

        await sendTransactionalEmail({
          to: existing.customer.email,
          subject: `Votre commande ${existing.orderNumber} est prête`,
          html,
        });

        await prisma.shipment.update({
          where: { orderId: id },
          data: { readyEmailSentAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        alreadySent,
        message: alreadySent
          ? "La commande était déjà prête et le client avait déjà été informé."
          : "Commande marquée prête et email envoyé au client.",
      });
    }

    const status = String(body.status ?? "");
    const shipmentStatus = String(body.shipmentStatus ?? status);
    const trackingNo = body.trackingNo ? String(body.trackingNo).trim() : null;
    const carrier = body.carrier ? String(body.carrier).trim() : null;

    if (!isWorkflowOrderStatus(status) || !isWorkflowOrderStatus(shipmentStatus)) {
      return NextResponse.json({ error: "Statut de commande invalide." }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id }, include: { customer: true, shipment: true } });
    if (!existing) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });

    if (!canTransitionOrder(existing.status, status)) {
      return NextResponse.json(
        { error: "Cette transition de statut n’est pas autorisée depuis l’état actuel de la commande." },
        { status: 409 },
      );
    }

    const pickup = isPickupCarrier(carrier || existing.shipment?.carrier);
    if (status === "READY_FOR_PICKUP" && !pickup) {
      return NextResponse.json({ error: "Le statut prêt au retrait est réservé aux commandes en retrait boutique." }, { status: 400 });
    }
    if (status === "SHIPPED" && (pickup || !carrier || !trackingNo)) {
      return NextResponse.json({ error: "Une expédition exige un transporteur et un numéro de suivi." }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: status as never },
      });

      await tx.shipment.upsert({
        where: { orderId: id },
        update: { trackingNo, carrier, status: shipmentStatus },
        create: { orderId: id, trackingNo, carrier, status: shipmentStatus },
      });

      return updatedOrder;
    });

    let emailWarning: string | undefined;
    const emailableStatuses = new Set(["PREPARING", "DELIVERED", "CANCELLED", "REFUNDED"]);
    if (existing.status !== status && emailableStatuses.has(status)) {
      try {
        const customerName = [existing.customer.firstName, existing.customer.lastName].filter(Boolean).join(" ").trim();
        const labels: Record<string, string> = {
          PREPARING: `Votre commande ${existing.orderNumber} est en préparation`,
          DELIVERED: `Votre commande ${existing.orderNumber} a été livrée`,
          CANCELLED: `Votre commande ${existing.orderNumber} a été annulée`,
          REFUNDED: `Remboursement de la commande ${existing.orderNumber}`,
        };
        await sendTransactionalEmail({
          to: existing.customer.email,
          subject: labels[status],
          html: customerOrderStatusEmail({
            name: customerName || null,
            reference: existing.orderNumber,
            status: status as "PREPARING" | "DELIVERED" | "CANCELLED" | "REFUNDED",
          }),
        });
      } catch (emailError) {
        console.error("FAST CASH order status email failed", emailError);
        emailWarning = "Statut enregistré, mais l'email client n'a pas pu être envoyé.";
      }
    }

    return NextResponse.json({ order, emailWarning });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    console.error("FAST CASH order update failed", error);
    return NextResponse.json({ error: "Unable to update order." }, { status: 500 });
  }
}
