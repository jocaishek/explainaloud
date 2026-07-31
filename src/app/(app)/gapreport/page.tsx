import { TopicHub } from "../topic-hub";

export default function GapReportHubPage() {
  return (
    <TopicHub
      path="gaps"
      title="Gap Report"
      lede="What each explanation got wrong, and what it never reached."
      needsRecording
    />
  );
}
