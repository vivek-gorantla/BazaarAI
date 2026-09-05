import { Kafka, Producer, Consumer, Partitioners } from "kafkajs";

export class AuditLogger {
    private kafka: Kafka;
    private producer: Producer;
    private isConnected: boolean = false;
    private static instance: AuditLogger;

    private constructor() {
        const brokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ["localhost:9092"];
        
        this.kafka = new Kafka({
            clientId: "baazar-backend-audit",
            brokers,
        });

        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner
        });
    }

    public static getInstance(): AuditLogger {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }

    public async connect() {
        if (this.isConnected) return;
        try {
            await this.producer.connect();
            this.isConnected = true;
            console.log("[KafkaAudit] Connected to Kafka producer");
        } catch (error) {
            console.error("[KafkaAudit] Failed to connect to Kafka producer:", error);
        }
    }

    public async disconnect() {
        if (!this.isConnected) return;
        try {
            await this.producer.disconnect();
            this.isConnected = false;
            console.log("[KafkaAudit] Disconnected from Kafka producer");
        } catch (error) {
            console.error("[KafkaAudit] Failed to disconnect from Kafka producer:", error);
        }
    }

    /**
     * Log an agent-specific event to the agent-logs topic.
     * @param eventType Action like 'INTENT_CLASSIFICATION', 'AGENT_STARTED', 'TOOL_CALLED', etc.
     * @param payload The data related to the event (arguments, output, etc.)
     * @param metadata Context like storeId, merchantId, agentName.
     */
    public async logAgentEvent(
        eventType: string,
        payload: any,
        metadata: { storeId?: string; merchantId?: string; agentName?: string; userId?: string } = {}
    ) {
        if (!this.isConnected) await this.connect();

        const message = {
            timestamp: new Date().toISOString(),
            eventType,
            metadata,
            payload,
        };

        try {
            await this.producer.send({
                topic: "agent-logs",
                messages: [{ value: JSON.stringify(message) }],
            });
        } catch (error) {
            console.error(`[KafkaAudit] Error logging agent event ${eventType}:`, error);
        }
    }

    /**
     * Log a standard system API event to the system-logs topic.
     * @param eventType Action like 'API_REQUEST', 'API_RESPONSE', etc.
     * @param payload Request/Response details
     * @param metadata Context like userId, merchantId, ip, etc.
     */
    public async logSystemEvent(
        eventType: string,
        payload: any,
        metadata: { storeId?: string; merchantId?: string; userId?: string; ip?: string; path?: string; method?: string } = {}
    ) {
        if (!this.isConnected) await this.connect();

        const message = {
            timestamp: new Date().toISOString(),
            eventType,
            metadata,
            payload,
        };

        try {
            await this.producer.send({
                topic: "system-logs",
                messages: [{ value: JSON.stringify(message) }],
            });
        } catch (error) {
            console.error(`[KafkaAudit] Error logging system event ${eventType}:`, error);
        }
    }

    /**
     * Create a new consumer. Useful for SSE streaming.
     */
    public createConsumer(groupId: string): Consumer {
        return this.kafka.consumer({ groupId });
    }
}

export const auditLogger = AuditLogger.getInstance();
