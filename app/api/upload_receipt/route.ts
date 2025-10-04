import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from "@/lib/prisma";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define Zod schema for form fields
const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  date: z.string().min(1, 'Date is required'),
  paidById: z.string().min(1, 'Paid by ID is required'),
  remarks: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected']),
  companyId: z.string().min(1, 'Company ID is required'),
});

// Define schema for file validation
const fileSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  type: z.string().refine(
    (type) => type.startsWith('image/'),
    'File must be an image'
  ),
});

// Helper function to upload to Cloudinary
async function uploadToCloudinary(file: File): Promise<{
  url: string;
  publicId: string;
  secureUrl: string;
}> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'receipts',
        resource_type: 'auto',
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
        } else {
          resolve({
            url: result.url,
            publicId: result.public_id,
            secureUrl: result.secure_url,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    // Get the form data
    const formData = await request.formData();
    
    // Extract form fields
    const description = formData.get('description');
    const category = formData.get('category');
    const amount = formData.get('amount');
    const currency = formData.get('currency');
    const date = formData.get('date');
    const paidById = formData.get('paidById');
    const remarks = formData.get('remarks');
    const status = formData.get('status') || 'Pending';
    const companyId = formData.get('companyId');
    
    // Extract the file (optional based on schema)
    const file = formData.get('image') as File | null;
    
    // Validate form fields with Zod
    const formValidation = formSchema.safeParse({
      description,
      category,
      amount,
      currency,
      date,
      paidById,
      remarks: remarks || undefined,
      status,
      companyId,
    });
    
    if (!formValidation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: formValidation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }
    
    let imageUrl: string | null = null;
    
    // Upload to Cloudinary if file is provided
    if (file) {
      // Validate file with Zod
      const fileValidation = fileSchema.safeParse({
        size: file.size,
        type: file.type,
      });
      
      if (!fileValidation.success) {
        return NextResponse.json(
          { 
            error: 'File validation failed',
            details: fileValidation.error.flatten().fieldErrors
          },
          { status: 400 }
        );
      }
      
      const uploadResult = await uploadToCloudinary(file);
      imageUrl = uploadResult.secureUrl;
    }
    
    const receipt = await prisma.reciept.create({
      data: {
        description: formValidation.data.description,
        category: formValidation.data.category,
        amount: formValidation.data.amount,
        currency: formValidation.data.currency,
        date: new Date(formValidation.data.date),
        paidById: formValidation.data.paidById,
        remarks: formValidation.data.remarks,
        status: formValidation.data.status,
        companyId: formValidation.data.companyId,
        imageUrl: imageUrl,
      },
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Receipt created successfully',
      data: {
        ...formValidation.data,
        imageUrl,
        id: receipt.id,
      }
    });
    
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create receipt' },
      { status: 500 }
    );
  }
}