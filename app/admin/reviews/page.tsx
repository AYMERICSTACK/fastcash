import { requireAdminSession } from "@/lib/session";
import { getManualReviews } from "@/lib/manual-reviews";
import ReviewsManager from "./ReviewsManager";
export const dynamic="force-dynamic";
export default async function ReviewsPage(){await requireAdminSession(); return <ReviewsManager initialReviews={await getManualReviews()}/>;}
