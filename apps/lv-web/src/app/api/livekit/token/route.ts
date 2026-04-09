import { AccessToken, RoomServiceClient, VideoGrant } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json({ error: 'Missing roomName or participantName' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !liveKitUrl) {
      return NextResponse.json({ error: 'Missing LiveKit credentials' }, { status: 500 });
    }

    // Delete any existing room before issuing the token.
    // Without this, a user who rejoins quickly may land in the old room
    // (whose deletion is still in-flight on LiveKit Cloud), and LiveKit
    // won't re-dispatch the agent to a room it already considers "handled".
    // Deleting here makes the join always create a fresh room → reliable agent dispatch.
    try {
      const roomService = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);
      await roomService.deleteRoom(roomName);
    } catch {
      // Room didn't exist or was already deleted — that's fine, carry on.
    }

    // Generate access token for the participant
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
