/** GET /api/topics: public paginated canonical-topic index. */
import { topicResponse, TopicContext } from './topicEndpoint.js';
export function onRequestGet(context: TopicContext): Promise<Response> {
  const url = new URL(context.request.url);
  return topicResponse(context, { resource: 'list', limit: Number(url.searchParams.get('limit')) || undefined, cursor: url.searchParams.get('cursor') || undefined });
}
