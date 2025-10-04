import { Hashing } from "@/app/lib/utils";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

const UserSchema = z.object({
    companyId: z.string(),
    name: z.string(),
    email: z.string(),
    password: z.string(),
    role: z.enum(["Employee", "Admin", "Manager"])
})

export async function POST(req: NextRequest) {
    try {
        const { companyId, name, email, role, password } = await UserSchema.parseAsync(await req.json());

        const hashedPassword = await Hashing(password);

        const user = await prisma.user.create({
            data: {
                companyId,
                name,
                email,
                role,
                hashedPassword,
            }
        });

        return NextResponse.json({message: "User added successfully!"}, {status: 200});
        
    } catch (error) {
        if(error instanceof z.ZodError) {
            return NextResponse.json({message: error.issues}, {status: 400});
        }
        console.log("Error: ", error);
        return NextResponse.json({message: "Internal Server Error!"}, {status: 500});
    }

}