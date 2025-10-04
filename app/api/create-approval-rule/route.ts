import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from "jsonwebtoken";
import * as z from "zod";

const ApprovalRuleForm = z.object({
  ruleName: z.string().min(1, "Rule name is required"),
  isManagerApprover: z.boolean(),
  approvers: z.array(z.string().uuid()).min(1, "At least one approver is required"),
})

export async function POST(req: NextRequest) {
  try {
    const { ruleName, isManagerApprover, approvers } = await ApprovalRuleForm.parseAsync(await req.json());

    // Get access token from cookies
    const accessToken = req.cookies.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify and decode the JWT token
    let decodedToken: JwtPayload | string;
    try {
      decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET!) as string;
    } catch (error) {
      console.log("JWT Verification Error:", error);
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const userId = typeof decodedToken === "object" && "id" in decodedToken ? decodedToken.id : decodedToken;
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is admin or manager
    if (user.role !== "Admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Create approval rule
    const approvalRule = await prisma.approvalRule.create({
      data: {
        name: ruleName,
        isManagerApprover: isManagerApprover,
        companyId: user.companyId,
        approvers: {
          connect: approvers.map((approverId: string) => ({ id: approverId })),
        },
      }
    });

    console.log("Approval Rule Created:", approvalRule.id);

    const response = NextResponse.json({ message: "Approval rule created Successfully!" }, { status: 200 });
    return response;
  } catch (error) {
    if(error instanceof z.ZodError){
        return NextResponse.json({message: error.issues}, {status: 400});
    }
    console.error("Error", error);
    return NextResponse.json({ message: "Server error please try again!" }, { status: 500 }); 
  }
}
