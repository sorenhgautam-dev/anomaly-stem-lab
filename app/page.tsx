import { ViewTransition } from "react";
import { Landing } from "@/components/landing/Landing";

export default function Home() {
  return (
    <ViewTransition>
      <Landing />
    </ViewTransition>
  );
}
