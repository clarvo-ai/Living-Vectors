import { authOptions } from '@repo/lib';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const ROOM_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const PARTICIPANT_NAME_MAX = 200;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomName, participantName } = body ?? {};

    if (
      typeof roomName !== 'string' ||
      typeof participantName !== 'string' ||
      !roomName ||
      !participantName
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid roomName / participantName' },
        { status: 400 }
      );
    }

    if (!ROOM_NAME_RE.test(roomName)) {
      return NextResponse.json(
        { error: 'roomName must be 1-128 alphanumeric/dash/underscore characters' },
        { status: 400 }
      );
    }

    if (participantName.length > PARTICIPANT_NAME_MAX) {
      return NextResponse.json(
        { error: `participantName must be at most ${PARTICIPANT_NAME_MAX} characters` },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !liveKitUrl) {
      return NextResponse.json({ error: 'Missing LiveKit credentials' }, { status: 500 });
    }

    const token = new AccessToken(apiKey, apiSecret);
    token.identity = participantName;

    const videoGrant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    token.addGrant(videoGrant);
    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: liveKitUrl,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
