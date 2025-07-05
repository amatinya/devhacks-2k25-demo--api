import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, now } from "mongoose";

@Schema({ _id: false })
export class Component {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true, enum: ["document", "template"] })
  type: "document" | "template";

  @Prop({ type: String, required: true })
  name: string;
}
export const ComponentSchema = SchemaFactory.createForClass(Component);

@Schema({ _id: false })
export class ToolCall {
  @Prop({ type: String, required: true })
  id: string;

  @Prop({ type: String, required: true, enum: ["function"] })
  type: "function";

  @Prop({
    type: { name: { type: String, required: true }, arguments: { type: String, required: true } },
    required: true,
  })
  function: { name: string; arguments: string };
}
export const ToolCallSchema = SchemaFactory.createForClass(ToolCall);

@Schema({ _id: false, timestamps: true })
export class ChatMessage {
  @Prop({ type: String, required: true, enum: ["user", "assistant", "system", "tool"] })
  role: "user" | "assistant" | "system" | "tool";

  @Prop({ type: String, required: false, default: null })
  content: string | null;

  @Prop({ type: String, required: false, default: null })
  toolCallId: string | null;

  @Prop({ type: [ToolCallSchema], required: false, default: null })
  toolCalls: ToolCall[] | null;

  @Prop({ type: [Component], required: false, default: [] })
  components: Component[];

  @Prop({ type: Date, default: now })
  createdAt: Date;

  @Prop({ type: Date, default: now })
  updatedAt: Date;
}
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

@Schema({ timestamps: true, versionKey: false, collection: "chats" })
export class Chat {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: [ChatMessageSchema], required: true, default: [] })
  messages: ChatMessage[];

  @Prop({ type: Date, default: now })
  createdAt: Date;

  @Prop({ type: Date, default: now })
  updatedAt: Date;
}
export const ChatSchema = SchemaFactory.createForClass(Chat);
export type ChatDocument = HydratedDocument<Chat>;
