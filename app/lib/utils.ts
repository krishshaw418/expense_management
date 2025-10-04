import {genSaltSync, hashSync, compareSync} from "bcrypt-ts";
import * as crypto from "crypto";
import dns from "dns/promises";

// For hashing password before storing into db
export async function Hashing(password: string): Promise<string> {
    const salt = genSaltSync(12);
    const hashedPassword = hashSync(password, salt);
    return hashedPassword;
}

// For verifying password before login
export async function VerifyingHash(hashedPassword: string, password: string): Promise<boolean> {
    const isCorrect = compareSync(password, hashedPassword);
    return isCorrect;
}

// For generating password reset token
export function generatePasswordResetToken(length = 64): string{
    return crypto.randomBytes(length).toString('hex');
}

// For validating email address
export async function validateEmail(email: string) {
  const domain = email.split('@')[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    if(!mxRecords[0].exchange) {
      return false;
    }
    return true;
  } catch (error) {
    console.log("Error: ", error);
    return false;
  }
}