import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getManualReviews, saveManualReviews, type ManualReview } from "@/lib/manual-reviews";

export async function GET(){ if(!(await getAdminSession())) return NextResponse.json({error:"Non autorisé"},{status:401}); return NextResponse.json({reviews:await getManualReviews()}); }
export async function PUT(req:Request){
 if(!(await getAdminSession())) return NextResponse.json({error:"Non autorisé"},{status:401});
 const body=await req.json().catch(()=>null); if(!Array.isArray(body?.reviews)) return NextResponse.json({error:"Données invalides"},{status:400});
 const reviews:ManualReview[]=body.reviews.slice(0,100).map((r:any,i:number)=>({id:String(r.id||`review-${Date.now()}-${i}`),author:String(r.author||"").trim().slice(0,120),photoUrl:null,rating:Math.max(0,Math.min(5,Number(r.rating)||0)),comment:String(r.comment||"").trim().slice(0,3000),createTime:String(r.createTime||""),dateLabel:String(r.dateLabel||"").trim().slice(0,80),published:Boolean(r.published)})).filter((r:ManualReview)=>r.author&&r.comment);
 await saveManualReviews(reviews); return NextResponse.json({ok:true,reviews});
}
