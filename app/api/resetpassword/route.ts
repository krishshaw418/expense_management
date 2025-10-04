import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import crypto from 'crypto';
import rateLimiter from "@/lib/limiter";
import { headers } from "next/headers";
import { Hashing } from "@/app/lib/utils";

export async function POST(req: NextRequest) {

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    console.log("Ip: ", ip);
    try {
        await rateLimiter.consume(ip, 2);
    } catch {
        return NextResponse.json({message: "This request cannot be made so frequently! Please try again after sometime."}, {status: 429}); 
    }

    const { email } = await req.json();
    if(!email) return NextResponse.json({error: "Email required!"}, { status: 400 });
    
    try {
        const admin = await prisma.user.findUnique({
            where: {
                email,
            }
        })

        if(!admin) return NextResponse.json({error: "User not found!"}, { status: 404 });

        const temporaryPassword = crypto
        .randomBytes(length)
        .toString("base64")
        .slice(0, length)
        .replace(/\+/g, "A")  // removed URL-unsafe chars
        .replace(/\//g, "B");

        const hashedPassword = await Hashing(temporaryPassword);
        await prisma.user.update({
            where: { email },
            data: {
                hashedPassword
            },
        });

        await sendEmail(email, temporaryPassword);
        
        return NextResponse.json({message: "Please check your mail for a temporary password!"});
    } catch (error) {
        console.log("Error: ", error);
        return NextResponse.json({error: "Server Error!"}, { status: 500 });
    }
}
