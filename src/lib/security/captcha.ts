export async function verifyCaptcha(token: string): Promise<boolean> {
  if (process.env.NODE_ENV === "test") {
    return true;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY is not set. Bypassing CAPTCHA verification.");
    return true;
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("CAPTCHA verification failed:", error);
    return false;
  }
}
