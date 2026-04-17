

async function testVerify() {
    const email = "test@example.com"; // This user should exist in your local DB
    const otp = "123456";

    console.log("Testing verify with wrong OTP...");
    const res = await fetch("http://localhost:3000/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    });

    const body = await res.json();
    console.log("Status:", res.status);
    console.log("Body:", body);
}

testVerify();
