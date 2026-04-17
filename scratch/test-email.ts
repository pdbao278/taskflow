import { emailService } from "../src/lib/services/email.service";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  try {
    console.log("Sending test email...");
    await emailService.sendOTP("accfamlala1@gmail.com", "123456", "LOGIN");
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
