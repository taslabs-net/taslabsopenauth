import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";

// This value should be shared between the OpenAuth server Worker and other
// client Workers that you connect to it, so the types and schema validation are
// consistent.
const subjects = createSubjects({
  user: object({
    id: string(),
  }),
});

// Allowed OAuth clients for security
const ALLOWED_CLIENTS = {
  "contact-form": {
    name: "Taslabs Contact Form",
    allowed_redirects: [
      "https://contact.taslabs.net/callback",
      "http://localhost:8787/callback", // For local development
    ]
  },
  "your-client-id": {
    name: "Demo Client", 
    allowed_redirects: [
      `${new URL("").origin}/callback` // For the demo flow
    ]
  }
};

function validateClient(client_id: string, redirect_uri: string): boolean {
  const client = ALLOWED_CLIENTS[client_id as keyof typeof ALLOWED_CLIENTS];
  if (!client) {
    return false;
  }
  
  // Allow any redirect for demo client
  if (client_id === "your-client-id") {
    return true;
  }
  
  return client.allowed_redirects.includes(redirect_uri);
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // This top section is just for demo purposes. In a real setup another
    // application would redirect the user to this Worker to be authenticated,
    // and after signing in or registering the user would be redirected back to
    // the application they came from. In our demo setup there is no other
    // application, so this Worker needs to do the initial redirect and handle
    // the callback redirect on completion.
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.searchParams.set("redirect_uri", url.origin + "/callback");
      url.searchParams.set("client_id", "your-client-id");
      url.searchParams.set("response_type", "code");
      url.pathname = "/authorize";
      return Response.redirect(url.toString());
    } else if (url.pathname === "/callback") {
      return Response.json({
        message: "OAuth flow complete!",
        params: Object.fromEntries(url.searchParams.entries()),
      });
    }

    // The real OpenAuth server code starts here:
    // Security check for OAuth authorize requests
    if (url.pathname === "/authorize") {
      const client_id = url.searchParams.get("client_id");
      const redirect_uri = url.searchParams.get("redirect_uri");
      
      if (!client_id || !redirect_uri) {
        return new Response("Missing required parameters", { status: 400 });
      }
      
      if (!validateClient(client_id, redirect_uri)) {
        return new Response(`Unauthorized client: ${client_id}. This OAuth server is for Taslabs services only.`, { 
          status: 401,
          headers: { "Content-Type": "text/plain" }
        });
      }
    }

    return issuer({
      storage: CloudflareStorage({
        namespace: env.AUTH_STORAGE,
      }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              const response = await fetch(
                `https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    from: "Taslabs OAuth <auth@taslabs.com>",
                    to: email,
                    subject: "Your verification code",
                    text: `Your verification code is: ${code}`,
                    html: `<p>Your verification code is: <strong>${code}</strong></p>`,
                  }),
                }
              );
              
              if (!response.ok) {
                console.error("Failed to send email:", await response.text());
                throw new Error("Failed to send verification email");
              }
              
              console.log(`Verification code sent to ${email}`);
            },
            copy: {
              input_code: "Enter verification code",
              input_email_placeholder: "Enter your email address",
              submit_email: "Sign In / Sign Up",
              heading: "Sign In / Sign Up",
            },
          }),
        ),
      },
      theme: {
        title: "Taslabs ID",
        primary: "#0051c3",
        favicon: "https://workers.cloudflare.com//favicon.ico",
        logo: {
          dark: "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/db1e5c92-d3a6-4ea9-3e72-155844211f00/public",
          light:
            "https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fa5a3023-7da9-466b-98a7-4ce01ee6c700/public",
        },
      },
      success: async (ctx, value) => {
        return ctx.subject("user", {
          id: await getOrCreateUser(env, value.email),
        });
      },
    }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.AUTH_DB.prepare(
    `
		INSERT INTO user (email)
		VALUES (?)
		ON CONFLICT (email) DO UPDATE SET email = email
		RETURNING id;
		`,
  )
    .bind(email)
    .first<{ id: string }>();
  if (!result) {
    throw new Error(`Unable to process user: ${email}`);
  }
  console.log(`Found or created user ${result.id} with email ${email}`);
  return result.id;
}
