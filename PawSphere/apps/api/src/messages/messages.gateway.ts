import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SupabaseService } from '../supabase/supabase.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token — disconnecting`);
      client.disconnect();
      return;
    }

    const { data, error } = await this.supabaseService.admin.auth.getUser(token);
    if (error || !data.user) {
      this.logger.warn(`Client ${client.id} failed auth — disconnecting`);
      client.disconnect();
      return;
    }

    client.userId = data.user.id;
    client.userEmail = data.user.email ?? '';
    this.logger.log(`Client connected: ${client.id} (user: ${client.userEmail})`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() bookingId: string,
  ) {
    if (!client.userId) return;

    const isParticipant = await this.messagesService.verifyBookingParticipant(
      bookingId,
      client.userId,
    );
    if (!isParticipant) {
      client.emit('error', { message: 'Not a participant of this booking' });
      return;
    }

    client.join(`booking:${bookingId}`);

    const history = await this.messagesService.getHistory(bookingId);
    client.emit('history', history);

    this.logger.log(`User ${client.userEmail} joined booking:${bookingId}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { bookingId: string; content: string },
  ) {
    if (!client.userId) return;
    if (!payload?.bookingId || !payload?.content?.trim()) return;

    const isParticipant = await this.messagesService.verifyBookingParticipant(
      payload.bookingId,
      client.userId,
    );
    if (!isParticipant) {
      client.emit('error', { message: 'Not a participant of this booking' });
      return;
    }

    const message = await this.messagesService.saveMessage(
      payload.bookingId,
      client.userId,
      payload.content.trim(),
    );

    // Broadcast to everyone in the booking room (including sender for consistent state)
    this.server.to(`booking:${payload.bookingId}`).emit('message', message);
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() bookingId: string) {
    client.leave(`booking:${bookingId}`);
    this.logger.log(`User ${client.userEmail} left booking:${bookingId}`);
  }
}
