import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt, { JwtPayload } from "jsonwebtoken";
import * as z from "zod";

const AttachApprovalRuleForm = z.object({
    employeeId: z.string(),
    approvalRuleId: z.string()
})

export async function POST(req: NextRequest) {
  try {
    const { employeeId, approvalRuleId } = await AttachApprovalRuleForm.parseAsync(await req.json());

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

    // Attach approval rule to employee
    const employee = await prisma.user.findUnique({
        where: { id: employeeId, companyId: user.companyId },
        include: { approvalRule: true },
    });

    if (!employee) {
        return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    if (employee.approvalRuleId === approvalRuleId) {
        return NextResponse.json({ message: "Approval rule already attached to this employee" }, { status: 400 });
    }

    const approvalRule = await prisma.approvalRule.findUnique({
        where: { id: approvalRuleId, companyId: user.companyId },
    });
    
    if (!approvalRule) {
        return NextResponse.json({ message: "Approval rule not found" }, { status: 404 });
    }

    await prisma.user.update({
        where: { id: employeeId },
        data: { approvalRuleId: approvalRuleId },
    });

    const response = NextResponse.json({ message: "Approval rule attached to user Successfully!" }, { status: 200 });
    return response;
  } catch (error) {
    if(error instanceof z.ZodError){
        return NextResponse.json({message: error.issues}, {status: 400});
    }
    console.error("Error", error);
    return NextResponse.json({ message: "Server error please try again!" }, { status: 500 }); 
  }
}
