/** Explicit opt-in configuration keeps paid semantic classification disabled by default. */
import { TopicModelConfig } from './topicSemanticAdjudicator.js';

export function topicModelConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TopicModelConfig {
  return { enabled: env.TOPIC_MODEL_ENABLED === 'true', apiKey: env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY, modelName: env.TOPIC_MODEL_NAME };
}
