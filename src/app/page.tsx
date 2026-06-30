import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

// Entry point:
//  - signed-in users go straight to the app
//  - first-time visitors see the welcome splash (static public/welcome.html),
//    which sets the `tpl_welcomed` cookie so it only shows once
//  - returning visitors go to the login page
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const seenWelcome = cookies().get("tpl_welcomed");
  redirect(seenWelcome ? "/login" : "/welcome.html");
}
