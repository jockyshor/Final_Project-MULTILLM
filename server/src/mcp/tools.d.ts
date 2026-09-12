declare function isPathSafe(targetPath: string): boolean;
export declare const projectTools: {
    list_directory: ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type?: undefined | 'function';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type: 'dynamic';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: false;
        supportsDeferredResults?: never;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: true;
        supportsDeferredResults?: boolean;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    });
    read_file: ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type?: undefined | 'function';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type: 'dynamic';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: false;
        supportsDeferredResults?: never;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: true;
        supportsDeferredResults?: boolean;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    });
    browse_web: ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type?: undefined | 'function';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type: 'dynamic';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: false;
        supportsDeferredResults?: never;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: true;
        supportsDeferredResults?: boolean;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    });
    get_weather: ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type?: undefined | 'function';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        description?: string | ((options: {
            context: NoInfer<import("@ai-sdk/provider-utils").Context>;
            experimental_sandbox?: import("ai").Experimental_SandboxSession;
        }) => string);
        strict?: boolean;
        inputExamples?: {
            input: unknown;
        }[];
        id?: never;
        isProviderExecuted?: never;
        args?: never;
        supportsDeferredResults?: never;
    } & {
        type: 'dynamic';
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: false;
        supportsDeferredResults?: never;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    }) | ({
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        metadata?: import("@ai-sdk/provider").JSONObject;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        contextSchema?: import("ai").FlexibleSchema<import("@ai-sdk/provider-utils").Context>;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
        onInputStart?: (options: import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        onInputAvailable?: (options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions<NoInfer<import("@ai-sdk/provider-utils").Context>>) => void | PromiseLike<void>;
        toModelOutput?: (options: {
            toolCallId: string;
            input: unknown;
            output: unknown;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>;
    } & {
        outputSchema?: import("ai").FlexibleSchema<unknown>;
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    } & {
        type: 'provider';
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        description?: never;
        strict?: never;
        inputExamples?: never;
    } & {
        isProviderExecuted: true;
        supportsDeferredResults?: boolean;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, unknown, NoInfer<import("@ai-sdk/provider-utils").Context>>;
    });
};
export { isPathSafe };
//# sourceMappingURL=tools.d.ts.map