import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway {
  @WebSocketServer()
  server: Server;

  emitLotteryCreated(lottery: any) {
    this.server.emit('lottery:created', lottery);
  }

  emitLotteryClosed(lottery: any) {
    this.server.emit('lottery:closed', lottery);
  }

  emitBetPlaced(bet: any) {
    this.server.emit('bet:placed', bet);
  }

  emitResultDeclared(result: any) {
    this.server.emit('result:declared', result);
  }
}
