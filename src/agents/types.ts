// Mirror of the frontend AgentUIContext types — kept in sync manually.
// These describe the current page's form schema sent from the browser.

export type AgentFieldType =
    | "text"
    | "email"
    | "tel"
    | "number"
    | "select"
    | "textarea"
    | "checkbox"
    | "date"
    | "time"
    | "file";

export interface AgentField {
    id: string;
    label: string;
    type: AgentFieldType;
    value?: unknown;
    required?: boolean;
    editable?: boolean;
    options?: string[];
    description?: string;
    placeholder?: string;
}

export interface AgentUIContext {
    pageId: string;
    pageTitle: string;
    fields: AgentField[];
    actions?: Array<{ id: string; label: string; type: string; enabled: boolean }>;
}

// WebSocket message types (Frontend → Backend)
export interface FillRequestMessage {
    type: "fill_request";
    transcription: string;
    uiContext: AgentUIContext;
}

// WebSocket message types (Backend → Frontend)
export interface FieldFillMessage {
    type: "field_fill";
    fieldId: string;
    value: string;
}

export interface DoneMessage {
    type: "done";
    summary: string;
    filledCount: number;
}

export interface ErrorMessage {
    type: "error";
    message: string;
}

export type AgentToClientMessage = FieldFillMessage | DoneMessage | ErrorMessage;
export type ClientToAgentMessage = FillRequestMessage;
