import { NextRequest, NextResponse } from "next/server";
import getRedisClient from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { VerifyingHash } from "@/app/lib/utils";
import * as z from "zod";

const SignInForm = z.object({
    email: z.string(),
    password: z.string()
})

export async function POST(req: NextRequest) {

  const redis = getRedisClient();

  try {
    const { email, password } = await SignInForm.parseAsync(await req.json());

    // Check if cached
    const cachedUserData = await redis.get(email);

    if (cachedUserData) {
      const cachedUser = JSON.parse(cachedUserData) as {
        hashedPassword: string;
        id: string;
      }
      // already in cache
      const isCorrect = await VerifyingHash(cachedUser.hashedPassword, password);

      if (!isCorrect) {
        return NextResponse.json({ message: "Invalid Credentials!" }, { status: 401 });
      }

      const token = jwt.sign({ id: cachedUser.id }, process.env.JWT_SECRET!, { expiresIn: "1h" });

      const response = NextResponse.json({ message: "Login Successful! (cached)" }, { status: 200 });
      response.cookies.set("access-token", token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60,
        path: "/",
        sameSite: "strict",
      });

      return response;
    }

    // Not in cache -> query DB
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found please signup!" }, { status: 404 });
    }

    const isCorrect = await VerifyingHash(user.hashedPassword, password);

    if (!isCorrect) {
      return NextResponse.json({ message: "Invalid Credentials!" }, { status: 401 });
    }

    // Save to cache with TTL (e.g., 15 minutes = 900 seconds)
    await redis.set(email, JSON.stringify({ hashedPassword: user.hashedPassword, id: user.id }), { EX: 900 });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: "1h" });

    const response = NextResponse.json({ message: "Login Successful!" }, { status: 200 });
    response.cookies.set("access-token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    if(error instanceof z.ZodError){
        return NextResponse.json({message: error.issues}, {status: 400});
    }
    console.error("Error", error);
    return NextResponse.json({ message: "Server error please try again!" }, { status: 500 }); 
  }
}
