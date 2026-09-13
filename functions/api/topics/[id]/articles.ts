/** GET /api/topics/:id/articles: public D1-backed topic collection. */
import { topicResponse, TopicContext } from '../topicEndpoint.js';
interface Context extends TopicContext { params: { id?: string }; }
export function onRequestGet(context: Context): Promise<Response> {
  const url = new URL(context.request.url);
  return topicResponse(context, { resource: 'articles', rawTopic: context.params.id, limit: Number(url.searchParams.get('limit')) || undefined, cursor: url.searchParams.get('cursor') || undefined });
}
