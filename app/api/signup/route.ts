import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { Hashing, validateEmail } from "@/app/lib/utils";
import * as z from "zod";

const SignupForm = z.object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
    company_name: z.string(),
    company_country: z.string(),
    company_address: z.string()
})

export async function POST(req: NextRequest){
    try {
        const {name, email, password, company_name, company_country, company_address} = await SignupForm.parseAsync(await req.json());

        const isValid = await validateEmail(email);
        if(!isValid) {
          return NextResponse.json({message: "Invalid email address!"}, {status: 400});
        }

        const hashedPassword = await Hashing(password);

        const ExistingUser = await prisma.user.findUnique({
          where: { email }
        });

        if(ExistingUser) return NextResponse.json({message: "User already exist. Please login."}, {status: 409});

        const company = await prisma.company.create({
          data: {name: company_name, country: company_country, address: company_address}
        })

        const user = await prisma.user.create({
            data: {name, email, hashedPassword: hashedPassword, companyId: company.id},
            select: {id: true, email: true, hashedPassword: true} 
        })

        const token = jwt.sign({id: user.id}, process.env.JWT_SECRET!, {expiresIn: '1h'});
        console.log("access-token: ", token);

        if(!token) return NextResponse.json({message: "Error generating token!"}, {status: 500});

        const response = NextResponse.json({message: "Signup Successful!"}, {status: 200});
        response.cookies.set("access-token", token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60
        });
        return response;
    }catch (error) {
        if(error instanceof z.ZodError){
            NextResponse.json({message: error.issues}, {status:400});
        }
        return NextResponse.json({message: "Signup Failed!"}, {status: 500});
    }  
}