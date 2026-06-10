# OYA - AI Meeting Copilot

IronHeart.AI Human-Computer Interface Runtime.

## Vision

IronHeart.AI is building a new interface layer between humans and computers.

Current paradigm:

```text
Human -> Screen -> Computer
```

Future paradigm:

```text
Human -> IronHeart Runtime -> Computer
```

Voice is only one interface. The same runtime can operate through earbuds, glasses, robots, smartphones, vehicles, AR interfaces, and intelligent devices.

The runtime provides memory, context, orchestration, voice interaction, knowledge retrieval, and decision support.

## Hackathon Project

**Product name:** OYA

**Tagline:** AI Meeting Copilot

OYA is a voice-native AI participant that joins meetings as an active attendee.

Unlike Otter, Fireflies, Read.ai, and Zoom AI Companion, OYA can speak during the meeting.

## Capabilities

- Joins meetings
- Introduces participants
- Presents the agenda
- Listens continuously
- Tracks discussion context
- Identifies unresolved topics
- Assists during deadlocks
- Provides verbal summaries
- Publishes structured meeting notes
- Stores post-call transcripts and summaries
- Runs optional AWS Bedrock post-call analysis
- Writes meeting memory into Hidoba Knowledge Processor

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Attendee.dev
- IronHeart.AI Runtime
- Exa Search
- Hidoba TTS
- Hidoba Knowledge Processor
- AWS S3
- AWS Bedrock
- Stripe
- Supabase

## Post-Call Pipeline

The realtime voice flow is unchanged. AWS is only used after a meeting ends.

```text
Zoom
-> Attendee.dev
-> OYA Runtime
-> Exa Search
-> Hidoba TTS
-> Meeting Ends
-> AWS S3
-> AWS Bedrock
-> Hidoba Knowledge Processor
-> Long-Term Memory
```

Post-call steps:

1. OYA collects or receives a completed meeting transcript.
2. The transcript is stored under an S3-style path:

```text
calls/YYYY/MM/DD/{call_id}/
```

3. AWS Bedrock receives the transcript as an optional reasoning layer.
4. Bedrock generates:
   - meeting summary
   - key decisions
   - action items
   - unresolved questions
5. Transcript, summary, markdown exports, and memory backups are stored in S3 or mock S3.
6. The enriched meeting memory is saved into Hidoba Knowledge Processor.

## AWS Routes

```text
POST /api/aws/s3/upload
POST /api/aws/bedrock/summarize
```

AWS environment variables:

```env
AWS_BEARER_TOKEN_BEDROCK=
AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_MOCK_MODE=true
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

If S3 credentials are missing or `AWS_S3_MOCK_MODE=true`, uploads run in mock mode and return deterministic S3-style keys without writing to AWS.

## Development

```bash
npm install
npm run dev
```
