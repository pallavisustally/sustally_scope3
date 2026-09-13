import { redirect } from "next/navigation";

export default function CommuteSurveyRedirect() {
  redirect("/activity?cat=7");
}
