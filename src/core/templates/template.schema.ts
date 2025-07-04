import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ timestamps: true, versionKey: false, collection: "templates" })
export class Template {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  webContentId: string;

  @Prop({ required: true })
  webContentLink: string;

  @Prop({ type: [String], required: true })
  variables: string[];
}

export type TemplateDocument = HydratedDocument<Template>;
export const TemplateSchema = SchemaFactory.createForClass(Template);
