import { Controller, Post, Body, Get, Delete, Param } from "@nestjs/common";

import { ChatsService } from "./chats.service";

@Controller("chats")
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post("")
  async startChat(@Body() { chat, message }: { chat: string | null; message: string }) {
    return this.chatsService.handleMessage({ chat, message });
  }

  @Get("")
  getChats() {
    return this.chatsService.find();
  }

  @Get(":chat")
  async getChat(@Param("chat") chat: string) {
    return { chat: await this.chatsService.findOne({ chat }) };
  }

  @Delete(":chat")
  deleteChat(@Param("chat") chat: string) {
    return this.chatsService.deleteOne({ chat });
  }
}
