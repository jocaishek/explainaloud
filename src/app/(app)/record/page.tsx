import { TopicHub } from "../topic-hub";

export default function RecordHubPage() {
  return (
    <TopicHub
      path="record"
      title="Record"
      lede="Pick a topic to explain out loud."
      needsRecording={false}
    />
  );
}
