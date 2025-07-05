import { ChatCompletionTool } from "openai/resources";

export const ChatsTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "select_template_and_extract_variables",
      description:
        "Identifies the most relevant template from available uploads based on a natural language prompt and extracts the required variables for that template. This ensures the user knows what inputs are needed before generating a document.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "A natural language query describing the desired document or use case, used to find the best-matching template and determine its required variables.",
          },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_document_from_template_with_variables",
      description:
        "Generates a document by populating a predefined template with user-provided variables. The template is identified by its unique ID, and the variables are supplied as key-value pairs where keys correspond to template placeholders.",
      parameters: {
        type: "object",
        properties: {
          template: {
            type: "string",
            description: "The unique identifier of the template to be used for document generation.",
          },
          variables: {
            type: "object",
            description:
              "A dictionary of variables where each key is a placeholder in the template and the corresponding value is the user-provided data to replace it.",
            additionalProperties: { type: "string" },
          },
        },
        required: ["template", "variables"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_generated_documents_by_prompt",
      description:
        "Finds previously generated documents that best match the user's natural language prompt. Searches by document content, title, template name, and variable values. Returns relevant documents with metadata and a variable preview.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "A natural language description of the document you're trying to find. Can include keywords, template type, variable values, or context.",
          },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_document_via_email",
      description:
        "Sends any available generated document to a specified email address. The document must be identified by its unique file ID. A custom message must be included in the email body.",
      parameters: {
        type: "object",
        properties: {
          recipient: {
            type: "string",
            description: "The email address of the recipient who will receive the document.",
          },
          subject: {
            type: "string",
            description: "The subject line of the email.",
          },
          message: {
            type: "string",
            description: "A message to include in the email body for the recipient.",
          },
          document: {
            type: "string",
            description:
              "The unique file ID of the generated document to send. Can be selected from available context.",
          },
        },
        required: ["recipient", "subject", "message", "document"],
      },
    },
  },
] as const;
