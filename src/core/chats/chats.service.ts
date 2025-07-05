import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ChatCompletionMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources";

import { OpenAiService } from "@/integrations/open-ai/open-ai.service";
import { loadSystemPrompt } from "@/integrations/open-ai/system-prompts";
import { TemplatesService } from "@/core/templates/templates.service";
import { DocumentsService } from "@/core/documents/documents.service";
import { MailerService } from "@/core/mailer/mailer.service";

import { Chat, ChatDocument, Component } from "./chat.schemas";
import { ChatsTools } from "./chats.tools";

/* ~ Typings ~ */

interface IParsedAssistantMessage {
  message: string;
  components: Component[];
}

type WithComponents<T> = T & {
  components: Component[];
};

@Injectable()
export class ChatsService implements OnModuleInit {
  private ChatSystemPrompt: string;
  private ChatNamingSummarySystemPrompt: string;
  private DocumentNamingSummarySystemPrompt: string;

  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
    private readonly openAiService: OpenAiService,
    private readonly templatesService: TemplatesService,
    private readonly documentsService: DocumentsService,
    private readonly mailerService: MailerService
  ) {}

  async onModuleInit() {
    [this.ChatSystemPrompt, this.ChatNamingSummarySystemPrompt, this.DocumentNamingSummarySystemPrompt] =
      await Promise.all([
        loadSystemPrompt({ name: "chat" }),
        loadSystemPrompt({ name: "chat-naming-summary" }),
        loadSystemPrompt({ name: "document-naming-summary" }),
      ]);
  }

  /* ~ Private ~ */

  private parseAssistantMessage({ message }: { message: string }): IParsedAssistantMessage {
    const defaultResult: IParsedAssistantMessage = { message: "", components: [] };

    if (!message?.trim()) {
      return defaultResult;
    }

    try {
      const parsed: unknown = JSON.parse(message);

      if (!parsed || typeof parsed !== "object") {
        return defaultResult;
      }

      const result: IParsedAssistantMessage = { ...defaultResult };
      const assistantMessage = parsed as IParsedAssistantMessage;

      if (assistantMessage.message && typeof assistantMessage.message === "string") {
        result.message = assistantMessage.message;
      }

      if (Array.isArray(assistantMessage.components)) {
        result.components = assistantMessage.components;
      }

      return result;
    } catch (error) {
      return defaultResult;
    }
  }

  private transformMessagesIntoOpenAiMessages({
    messages,
  }: {
    messages: ChatDocument["messages"];
  }): ChatCompletionMessageParam[] {
    return messages
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((message) => {
        if (message.role === "tool") {
          return {
            role: "tool",
            content: message.content ?? "<function-call>",
            tool_call_id: message.toolCallId!,
          } as WithComponents<ChatCompletionToolMessageParam>;
        }

        if (message.role === "assistant" && message.toolCalls?.length) {
          return {
            role: "assistant",
            content: message.content ?? "<function-call>",
            tool_calls: message.toolCalls.map((tc) => ({
              id: tc.id,
              type: tc.type,
              function: tc.function,
            })),
          } as WithComponents<ChatCompletionAssistantMessageParam>;
        }

        return {
          role: message.role,
          content: message.content ?? "<function-call>",
        } as WithComponents<ChatCompletionUserMessageParam | ChatCompletionSystemMessageParam>;
      });
  }

  private async summarizeMessage({ message }: { message: string }) {
    const response = await this.openAiService.createChat({
      messages: [
        { role: "system", content: this.ChatNamingSummarySystemPrompt },
        { role: "user", content: message },
      ],
    });

    return response.choices[0].message.content!.trim();
  }

  private async summarizeDocument({ info }: { info: string }) {
    const response = await this.openAiService.createChat({
      messages: [
        { role: "system", content: this.DocumentNamingSummarySystemPrompt },
        { role: "user", content: info },
      ],
    });

    return `${response.choices[0].message.content!.trim()}.docx`;
  }

  private async findOrCreate({ chat, name }: { chat: string | null; name: string }) {
    const systemMessage: ChatCompletionSystemMessageParam = { role: "system", content: this.ChatSystemPrompt };

    return chat ? this.chatModel.findById(chat) : this.chatModel.create({ name, messages: [systemMessage] });
  }

  private buildAssistantMessage({ reply }: { reply: ChatCompletionAssistantMessageParam }) {
    const isToolCall = !!reply.tool_calls?.length;
    const content = (reply.content as string) ?? "";
    const parsed = this.parseAssistantMessage({ message: content });

    return {
      role: reply.role,
      content: isToolCall ? "<function-call>" : parsed.message,
      components: parsed.components,
      tool_calls: reply.tool_calls,
    };
  }

  /* ~ Tools ~ */

  private async handleTemplateSelection({
    args,
    baseResult,
  }: {
    args: any;
    baseResult: WithComponents<ChatCompletionToolMessageParam>;
  }) {
    const { prompt } = args;
    const result = await this.templatesService.search({ prompt });

    if (!result) {
      return baseResult;
    }

    const { webContentId, webContentLink, ...template } = result;
    baseResult.content = JSON.stringify(template);
    return baseResult;
  }

  private async handleDocumentGeneration({
    args,
    baseResult,
  }: {
    args: any;
    baseResult: WithComponents<ChatCompletionToolMessageParam>;
  }) {
    const { template: templateId, ...variables } = args;
    const template = await this.templatesService.findOne({ template: templateId });

    if (!template) {
      return baseResult;
    }

    const document = await this.documentsService.generateFromTemplate({
      template,
      variables,
      name: await this.summarizeDocument({ info: JSON.stringify({ template, variables }) }),
    });

    const { webContentId, webContentLink, ...cleanDocument } = document;
    baseResult.content = JSON.stringify(cleanDocument);
    return baseResult;
  }

  private async handleDocumentSearch({
    args,
    baseResult,
  }: {
    args: any;
    baseResult: WithComponents<ChatCompletionToolMessageParam>;
  }) {
    const { prompt } = args;
    const documents = await this.documentsService.search({ prompt });
    baseResult.content = JSON.stringify(documents);
    return baseResult;
  }

  private async handleDocumentSendViaEmail({
    args,
    baseResult,
  }: {
    args: any;
    baseResult: WithComponents<ChatCompletionToolMessageParam>;
  }) {
    const { recipient, subject, message, document } = args;
    const { name, buffer } = await this.documentsService.getNameAndBuffer({ document });

    const mailingResult = await this.mailerService.send({
      recipient,
      subject,
      message,
      attachments: [
        {
          filename: name,
          content: buffer,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentDisposition: "attachment",
        },
      ],
    });

    baseResult.content = JSON.stringify(mailingResult);
    return baseResult;
  }

  private async executeToolCall({ toolCall }: { toolCall: ChatCompletionMessageToolCall }) {
    const { name, arguments: argsJSON } = toolCall.function;

    const args = JSON.parse(argsJSON);

    const baseResult: WithComponents<ChatCompletionToolMessageParam> = {
      role: "tool",
      tool_call_id: toolCall.id,
      components: [],
      content: "",
    };

    try {
      switch (name) {
        case "select_template_and_extract_variables":
          return this.handleTemplateSelection({ args, baseResult });
        case "generate_document_from_template_with_variables":
          return this.handleDocumentGeneration({ args, baseResult });
        case "search_generated_documents_by_prompt":
          return this.handleDocumentSearch({ args, baseResult });
        case "send_document_via_email":
          return this.handleDocumentSendViaEmail({ args, baseResult });
        default:
          return baseResult;
      }
    } catch (error) {
      baseResult.content = JSON.stringify({ error: "Tool execution failed" });
      return baseResult;
    }
  }

  private async processToolCalls({ toolCalls }: { toolCalls: ChatCompletionMessageToolCall[] }) {
    return Promise.all(toolCalls.map((tc) => this.executeToolCall({ toolCall: tc })));
  }

  /* ~ Public ~ */

  async handleMessage({ chat: chatId, message }: { chat: string | null; message: string }) {
    const chat = await this.findOrCreate({ chat: chatId, name: await this.summarizeMessage({ message }) });

    if (!chat) {
      throw new Error("Chat not found / created");
    }

    const pastMessages = this.transformMessagesIntoOpenAiMessages({ messages: chat.messages });
    const newMessages: Array<WithComponents<ChatCompletionMessageParam>> = [
      { role: "user", content: message, components: [] },
    ];

    let shouldProcessTools = true;

    while (shouldProcessTools) {
      const response = await this.openAiService.createChat({
        messages: [...pastMessages, ...newMessages],
        response_format: { type: "json_object" },
        tool_choice: "auto",
        tools: ChatsTools,
      });

      const assistantReply = response.choices[0].message;

      newMessages.push(this.buildAssistantMessage({ reply: assistantReply }));

      const isToolCall = !!assistantReply.tool_calls?.length;

      shouldProcessTools = isToolCall;

      if (isToolCall) {
        const toolResults = await this.processToolCalls({ toolCalls: assistantReply.tool_calls! });
        newMessages.push(...toolResults);
      }
    }

    await this.chatModel.updateOne(
      { _id: chat._id },
      {
        $push: {
          messages: {
            $each: newMessages.map((message) => ({
              role: message.role,
              content: message.content ?? "<function-call>",
              toolCalls: message.role === "assistant" && message.tool_calls ? message.tool_calls : null,
              toolCallId: message.role === "tool" ? message.tool_call_id : null,
              components: message.components,
            })),
          },
        },
      }
    );

    return { chat: chat._id };
  }

  async find() {
    const [chats, total] = await Promise.all([
      this.chatModel.find().sort({ createdAt: -1 }),
      this.chatModel.countDocuments(),
    ]);

    return { chats, total };
  }

  async deleteOne({ chat }: { chat: string }) {
    await this.chatModel.deleteOne({ _id: chat });
  }

  findOne({ chat }: { chat: string }) {
    return this.chatModel.findById(chat);
  }
}
