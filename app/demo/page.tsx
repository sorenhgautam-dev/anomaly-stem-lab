import { LabExperiment } from "@/components/lab/LabExperiment";

export const metadata = { title: "A one-minute tour · ANOMALY" };

/*
 * /demo (DESIGN.md §7.8): a 60-second guided tour of the real chemo
 * experiment. The lab is the same one students use; DemoTour drives it.
 */
export default function DemoPage() {
  return <LabExperiment id="treatment-chemo-hair" nextHref={null} mapHref="/labs/treatment/medium" demo />;
}
